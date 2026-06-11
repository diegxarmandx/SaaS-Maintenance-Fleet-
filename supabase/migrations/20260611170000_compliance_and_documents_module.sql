begin;

create table if not exists public.compliance_requirements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  compliance_type text not null,
  reminder_days integer not null default 30 check (reminder_days >= 0),
  notes text,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_requirements_type_not_blank
    check (length(trim(compliance_type)) > 0)
);

drop trigger if exists compliance_requirements_set_updated_at
on public.compliance_requirements;

create trigger compliance_requirements_set_updated_at
before update on public.compliance_requirements
for each row execute function public.set_updated_at();

alter table public.compliance_records
  add column if not exists requirement_id uuid;

alter table public.compliance_records
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'compliance_records_requirement_id_fkey'
  ) then
    alter table public.compliance_records
      add constraint compliance_records_requirement_id_fkey
      foreign key (requirement_id)
      references public.compliance_requirements(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'compliance_records_expiration_after_effective'
  ) then
    alter table public.compliance_records
      add constraint compliance_records_expiration_after_effective
      check (effective_date is null or expiration_date >= effective_date);
  end if;
end $$;

alter table public.documents
  add column if not exists document_type text not null default 'Other';

alter table public.documents
  add column if not exists storage_bucket text not null default 'fleet-documents';

update public.documents
set storage_bucket = case category
  when 'maintenance' then 'maintenance-attachments'
  when 'compliance' then 'compliance-documents'
  else 'fleet-documents'
end
where storage_bucket = 'fleet-documents'
  and category in ('maintenance', 'compliance');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_type_not_blank'
  ) then
    alter table public.documents
      add constraint documents_type_not_blank
      check (length(trim(document_type)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_bucket_allowed'
  ) then
    alter table public.documents
      add constraint documents_storage_bucket_allowed
      check (
        storage_bucket in (
          'fleet-documents',
          'maintenance-attachments',
          'compliance-documents'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_storage_path_company_scope'
  ) then
    alter table public.documents
      add constraint documents_storage_path_company_scope
      check (split_part(storage_path, '/', 1) = company_id::text);
  end if;
end $$;

create index if not exists compliance_requirements_company_id_idx
on public.compliance_requirements (company_id);

create index if not exists compliance_requirements_asset_id_idx
on public.compliance_requirements (asset_id);

create unique index if not exists compliance_requirements_active_unique
on public.compliance_requirements (company_id, asset_id, lower(compliance_type))
where archived_at is null;

create index if not exists compliance_records_requirement_id_idx
on public.compliance_records (requirement_id);

create index if not exists compliance_records_archived_at_idx
on public.compliance_records (company_id, archived_at);

create index if not exists documents_category_type_idx
on public.documents (company_id, category, document_type);

create index if not exists documents_storage_bucket_idx
on public.documents (company_id, storage_bucket);

create index if not exists documents_archived_at_idx
on public.documents (company_id, archived_at);

alter table public.compliance_requirements enable row level security;
alter table public.compliance_requirements force row level security;

drop policy if exists compliance_requirements_owner_access
on public.compliance_requirements;

create policy compliance_requirements_owner_access
on public.compliance_requirements for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('compliance-documents', 'compliance-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png']),
  ('fleet-documents', 'fleet-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.complete_maintenance_and_update_rule(
  p_record_id uuid,
  p_asset_id uuid,
  p_maintenance_rule_id uuid,
  p_maintenance_type text,
  p_completion_date date,
  p_mileage numeric,
  p_engine_hours numeric,
  p_service_provider text,
  p_parts_cost numeric,
  p_labor_cost numeric,
  p_other_cost numeric,
  p_notes text,
  p_attachment_name text default null,
  p_attachment_storage_path text default null,
  p_attachment_mime_type text default null,
  p_attachment_file_size bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  rule_record public.maintenance_rules%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if owner_company_id is null then
    raise exception 'Completed owner onboarding is required';
  end if;

  if not exists (
    select 1
    from public.assets
    where id = p_asset_id
      and company_id = owner_company_id
  ) then
    raise exception 'Asset not found for this owner company';
  end if;

  if p_maintenance_rule_id is not null then
    select *
    into rule_record
    from public.maintenance_rules
    where id = p_maintenance_rule_id
      and company_id = owner_company_id
      and asset_id = p_asset_id
    for update;

    if rule_record.id is null then
      raise exception 'Maintenance rule not found for this owner company asset';
    end if;
  end if;

  insert into public.maintenance_records (
    id,
    company_id,
    asset_id,
    maintenance_rule_id,
    maintenance_type,
    completion_date,
    mileage,
    engine_hours,
    service_provider,
    parts_cost,
    labor_cost,
    other_cost,
    notes
  )
  values (
    p_record_id,
    owner_company_id,
    p_asset_id,
    p_maintenance_rule_id,
    trim(p_maintenance_type),
    p_completion_date,
    p_mileage,
    p_engine_hours,
    nullif(trim(coalesce(p_service_provider, '')), ''),
    coalesce(p_parts_cost, 0),
    coalesce(p_labor_cost, 0),
    coalesce(p_other_cost, 0),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  if p_maintenance_rule_id is not null then
    update public.maintenance_rules
    set last_completed_date = p_completion_date,
        last_completed_mileage = p_mileage,
        last_completed_hours = p_engine_hours,
        next_due_date = case
          when rule_record.calendar_interval_days is not null
          then p_completion_date + rule_record.calendar_interval_days
          else null
        end,
        next_due_mileage = case
          when rule_record.mileage_interval is not null and p_mileage is not null
          then p_mileage + rule_record.mileage_interval
          else null
        end,
        next_due_hours = case
          when rule_record.hour_interval is not null and p_engine_hours is not null
          then p_engine_hours + rule_record.hour_interval
          else null
        end
    where id = p_maintenance_rule_id
      and company_id = owner_company_id;
  end if;

  if p_attachment_storage_path is not null then
    insert into public.documents (
      company_id,
      asset_id,
      maintenance_record_id,
      document_name,
      category,
      document_type,
      storage_bucket,
      storage_path,
      mime_type,
      file_size,
      issue_date,
      notes
    )
    values (
      owner_company_id,
      p_asset_id,
      p_record_id,
      coalesce(nullif(trim(p_attachment_name), ''), 'Maintenance attachment'),
      'maintenance',
      'Maintenance receipt',
      'maintenance-attachments',
      p_attachment_storage_path,
      coalesce(nullif(trim(p_attachment_mime_type), ''), 'application/octet-stream'),
      coalesce(p_attachment_file_size, 0),
      p_completion_date,
      'Receipt or invoice attachment for completed maintenance.'
    );
  end if;

  return p_record_id;
end;
$$;

create or replace function public.create_compliance_record_with_document(
  p_record_id uuid,
  p_requirement_id uuid,
  p_asset_id uuid,
  p_compliance_type text,
  p_issuing_organization text,
  p_identification_number text,
  p_effective_date date,
  p_expiration_date date,
  p_reminder_days integer,
  p_notes text,
  p_document_name text default null,
  p_document_storage_bucket text default null,
  p_document_storage_path text default null,
  p_document_mime_type text default null,
  p_document_file_size bigint default null,
  p_document_type text default null,
  p_document_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  resolved_requirement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if owner_company_id is null then
    raise exception 'Completed owner onboarding is required';
  end if;

  if not exists (
    select 1
    from public.assets
    where id = p_asset_id
      and company_id = owner_company_id
      and archived_at is null
  ) then
    raise exception 'Asset not found for this owner company';
  end if;

  if p_requirement_id is not null then
    select id
    into resolved_requirement_id
    from public.compliance_requirements
    where id = p_requirement_id
      and company_id = owner_company_id
      and asset_id = p_asset_id
      and archived_at is null
    for update;

    if resolved_requirement_id is null then
      raise exception 'Compliance requirement not found for this owner company asset';
    end if;
  else
    select id
    into resolved_requirement_id
    from public.compliance_requirements
    where company_id = owner_company_id
      and asset_id = p_asset_id
      and lower(compliance_type) = lower(trim(p_compliance_type))
      and archived_at is null
    order by created_at asc
    limit 1;

    if resolved_requirement_id is null then
      insert into public.compliance_requirements (
        company_id,
        asset_id,
        compliance_type,
        reminder_days,
        is_active
      )
      values (
        owner_company_id,
        p_asset_id,
        trim(p_compliance_type),
        coalesce(p_reminder_days, 30),
        true
      )
      returning id into resolved_requirement_id;
    end if;
  end if;

  insert into public.compliance_records (
    id,
    company_id,
    asset_id,
    requirement_id,
    compliance_type,
    issuing_organization,
    identification_number,
    effective_date,
    expiration_date,
    reminder_days,
    notes
  )
  values (
    p_record_id,
    owner_company_id,
    p_asset_id,
    resolved_requirement_id,
    trim(p_compliance_type),
    nullif(trim(coalesce(p_issuing_organization, '')), ''),
    nullif(trim(coalesce(p_identification_number, '')), ''),
    p_effective_date,
    p_expiration_date,
    coalesce(p_reminder_days, 30),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  if p_document_storage_path is not null then
    if p_document_storage_bucket <> 'compliance-documents' then
      raise exception 'Compliance documents must use the compliance-documents bucket';
    end if;

    if split_part(p_document_storage_path, '/', 1) <> owner_company_id::text then
      raise exception 'Document path is not scoped to this owner company';
    end if;

    insert into public.documents (
      company_id,
      asset_id,
      compliance_record_id,
      document_name,
      category,
      document_type,
      storage_bucket,
      storage_path,
      mime_type,
      file_size,
      issue_date,
      expiration_date,
      document_number,
      notes
    )
    values (
      owner_company_id,
      p_asset_id,
      p_record_id,
      coalesce(nullif(trim(p_document_name), ''), trim(p_compliance_type)),
      'compliance',
      coalesce(nullif(trim(p_document_type), ''), 'Inspection certificate'),
      p_document_storage_bucket,
      p_document_storage_path,
      coalesce(nullif(trim(p_document_mime_type), ''), 'application/octet-stream'),
      coalesce(p_document_file_size, 0),
      p_effective_date,
      p_expiration_date,
      nullif(trim(coalesce(p_document_number, '')), ''),
      'Compliance document uploaded by the owner.'
    );
  end if;

  return p_record_id;
end;
$$;

revoke all on function public.create_compliance_record_with_document(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  text
) from public;

grant execute on function public.create_compliance_record_with_document(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  date,
  date,
  integer,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  text
) to authenticated;

commit;
