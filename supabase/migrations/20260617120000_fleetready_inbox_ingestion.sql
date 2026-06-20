alter table public.maintenance_records
  drop column if exists total_cost;

alter table public.maintenance_records
  add column if not exists tax_cost numeric(12, 2) not null default 0 check (tax_cost >= 0);

alter table public.maintenance_records
  add column total_cost numeric(12, 2)
  generated always as (parts_cost + labor_cost + other_cost + tax_cost) stored;

create table if not exists public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  source_type text not null default 'owner_upload',
  detected_document_type text,
  status text not null default 'uploaded',
  extracted_data jsonb not null default '{}'::jsonb,
  corrected_data jsonb,
  confidence_score numeric(5, 4) check (
    confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)
  ),
  model_provider text,
  model_version text,
  error_message text,
  created_record_type text,
  created_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingestion_jobs_original_file_name_not_blank
    check (length(trim(original_file_name)) > 0),
  constraint ingestion_jobs_storage_path_not_blank
    check (length(trim(storage_path)) > 0),
  constraint ingestion_jobs_storage_path_company_scope
    check (split_part(storage_path, '/', 1) = company_id::text),
  constraint ingestion_jobs_status_allowed
    check (
      status in (
        'uploaded',
        'classifying',
        'extracted',
        'needs_review',
        'confirmed',
        'failed',
        'discarded'
      )
    ),
  constraint ingestion_jobs_source_type_allowed
    check (source_type in ('owner_upload')),
  constraint ingestion_jobs_record_type_allowed
    check (
      created_record_type is null
      or created_record_type in ('maintenance_record', 'document')
    )
);

create table if not exists public.ingestion_job_events (
  id uuid primary key default gen_random_uuid(),
  ingestion_job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ingestion_job_events_type_not_blank
    check (length(trim(event_type)) > 0)
);

drop trigger if exists ingestion_jobs_set_updated_at
on public.ingestion_jobs;

create trigger ingestion_jobs_set_updated_at
before update on public.ingestion_jobs
for each row execute function public.set_updated_at();

create index if not exists ingestion_jobs_company_created_idx
on public.ingestion_jobs (company_id, created_at desc);

create index if not exists ingestion_jobs_owner_created_idx
on public.ingestion_jobs (owner_id, created_at desc);

create index if not exists ingestion_jobs_company_status_idx
on public.ingestion_jobs (company_id, status, created_at desc);

create index if not exists ingestion_jobs_asset_id_idx
on public.ingestion_jobs (asset_id)
where asset_id is not null;

create unique index if not exists ingestion_jobs_company_storage_path_unique
on public.ingestion_jobs (company_id, storage_path);

create index if not exists ingestion_job_events_job_created_idx
on public.ingestion_job_events (ingestion_job_id, created_at desc);

create index if not exists ingestion_job_events_company_created_idx
on public.ingestion_job_events (company_id, created_at desc);

alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_jobs force row level security;

alter table public.ingestion_job_events enable row level security;
alter table public.ingestion_job_events force row level security;

drop policy if exists ingestion_jobs_owner_access
on public.ingestion_jobs;

create policy ingestion_jobs_owner_access
on public.ingestion_jobs for all
using (
  company_id = public.current_company_id()
  and owner_id = auth.uid()
)
with check (
  company_id = public.current_company_id()
  and owner_id = auth.uid()
);

drop policy if exists ingestion_job_events_owner_select
on public.ingestion_job_events;

create policy ingestion_job_events_owner_select
on public.ingestion_job_events for select
using (
  exists (
    select 1
    from public.ingestion_jobs jobs
    where jobs.id = ingestion_job_events.ingestion_job_id
      and jobs.company_id = public.current_company_id()
      and jobs.owner_id = auth.uid()
  )
);

drop policy if exists ingestion_job_events_owner_insert
on public.ingestion_job_events;

create policy ingestion_job_events_owner_insert
on public.ingestion_job_events for insert
with check (
  company_id = public.current_company_id()
  and exists (
    select 1
    from public.ingestion_jobs jobs
    where jobs.id = ingestion_job_events.ingestion_job_id
      and jobs.company_id = ingestion_job_events.company_id
      and jobs.company_id = public.current_company_id()
      and jobs.owner_id = auth.uid()
  )
);

drop function if exists public.complete_maintenance_and_update_rule(
  uuid,
  uuid,
  uuid,
  text,
  date,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  bigint
);

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
  p_attachment_file_size bigint default null,
  p_tax_cost numeric default 0
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
    tax_cost,
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
    coalesce(p_tax_cost, 0),
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

revoke all on function public.complete_maintenance_and_update_rule(
  uuid,
  uuid,
  uuid,
  text,
  date,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  bigint,
  numeric
) from public;

grant execute on function public.complete_maintenance_and_update_rule(
  uuid,
  uuid,
  uuid,
  text,
  date,
  numeric,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  bigint,
  numeric
) to authenticated;
