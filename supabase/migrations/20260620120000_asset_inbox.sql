alter table public.ingestion_jobs
  add column if not exists upload_note text,
  add column if not exists completed_at timestamptz;

alter table public.ingestion_jobs
  drop constraint if exists ingestion_jobs_status_allowed;

alter table public.ingestion_jobs
  add constraint ingestion_jobs_status_allowed
  check (
    status in (
      'uploaded',
      'classifying',
      'extracted',
      'needs_review',
      'needs_attention',
      'confirmed',
      'failed',
      'discarded'
    )
  );

alter table public.ingestion_jobs
  drop constraint if exists ingestion_jobs_source_type_allowed;

alter table public.ingestion_jobs
  add constraint ingestion_jobs_source_type_allowed
  check (source_type in ('owner_upload', 'asset_upload'));

alter table public.ingestion_jobs
  drop constraint if exists ingestion_jobs_record_type_allowed;

alter table public.ingestion_jobs
  add constraint ingestion_jobs_record_type_allowed
  check (
    created_record_type is null
    or created_record_type in (
      'maintenance_record',
      'compliance_record',
      'document'
    )
  );

alter table public.ingestion_jobs
  add constraint ingestion_jobs_asset_upload_requires_asset
  check (source_type <> 'asset_upload' or asset_id is not null);

alter table public.ingestion_jobs
  add constraint ingestion_jobs_asset_upload_path_scope
  check (
    source_type <> 'asset_upload'
    or (
      split_part(storage_path, '/', 1) = company_id::text
      and split_part(storage_path, '/', 2) = 'assets'
      and split_part(storage_path, '/', 3) = asset_id::text
      and split_part(storage_path, '/', 4) = 'inbox'
    )
  );

create index if not exists ingestion_jobs_asset_status_created_idx
on public.ingestion_jobs (company_id, asset_id, status, created_at desc)
where asset_id is not null;

alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_jobs force row level security;
alter table public.ingestion_job_events enable row level security;
alter table public.ingestion_job_events force row level security;

create or replace function public.complete_asset_inbox_maintenance(
  p_job_id uuid,
  p_record_id uuid,
  p_maintenance_rule_id uuid,
  p_maintenance_type text,
  p_completion_date date,
  p_mileage numeric,
  p_engine_hours numeric,
  p_service_provider text,
  p_parts_cost numeric,
  p_labor_cost numeric,
  p_other_cost numeric,
  p_tax_cost numeric,
  p_notes text,
  p_document_name text,
  p_document_type text,
  p_corrected_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  inbox_job public.ingestion_jobs%rowtype;
begin
  select *
  into inbox_job
  from public.ingestion_jobs
  where id = p_job_id
    and company_id = owner_company_id
    and owner_id = auth.uid()
    and asset_id is not null
    and status not in ('confirmed', 'discarded')
  for update;

  if inbox_job.id is null then
    raise exception 'Asset Inbox item not found';
  end if;

  perform public.complete_maintenance_and_update_rule(
    p_record_id,
    inbox_job.asset_id,
    p_maintenance_rule_id,
    p_maintenance_type,
    p_completion_date,
    p_mileage,
    p_engine_hours,
    p_service_provider,
    p_parts_cost,
    p_labor_cost,
    p_other_cost,
    p_notes,
    coalesce(nullif(trim(p_document_name), ''), inbox_job.original_file_name),
    inbox_job.storage_path,
    inbox_job.mime_type,
    inbox_job.file_size,
    p_tax_cost
  );

  update public.documents
  set document_type = coalesce(
        nullif(trim(p_document_type), ''),
        document_type
      )
  where company_id = owner_company_id
    and maintenance_record_id = p_record_id;

  update public.ingestion_jobs
  set status = 'confirmed',
      corrected_data = coalesce(
        p_corrected_data,
        jsonb_build_object(
          'category', 'maintenance',
          'maintenanceType', p_maintenance_type,
          'completionDate', p_completion_date
        )
      ),
      created_record_type = 'maintenance_record',
      created_record_id = p_record_id,
      completed_at = now()
  where id = p_job_id;

  insert into public.ingestion_job_events (
    ingestion_job_id,
    company_id,
    event_type,
    metadata
  )
  values (
    p_job_id,
    owner_company_id,
    'confirmed',
    jsonb_build_object(
      'createdRecordType', 'maintenance_record',
      'createdRecordId', p_record_id
    )
  );

  return p_record_id;
end;
$$;

create or replace function public.complete_asset_inbox_compliance(
  p_job_id uuid,
  p_record_id uuid,
  p_requirement_id uuid,
  p_compliance_type text,
  p_issuing_organization text,
  p_identification_number text,
  p_effective_date date,
  p_expiration_date date,
  p_reminder_days integer,
  p_notes text,
  p_document_name text,
  p_corrected_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  inbox_job public.ingestion_jobs%rowtype;
  resolved_requirement_id uuid;
begin
  select *
  into inbox_job
  from public.ingestion_jobs
  where id = p_job_id
    and company_id = owner_company_id
    and owner_id = auth.uid()
    and asset_id is not null
    and status not in ('confirmed', 'discarded')
  for update;

  if inbox_job.id is null then
    raise exception 'Asset Inbox item not found';
  end if;

  if p_requirement_id is not null then
    select id
    into resolved_requirement_id
    from public.compliance_requirements
    where id = p_requirement_id
      and company_id = owner_company_id
      and asset_id = inbox_job.asset_id
      and archived_at is null
    for update;

    if resolved_requirement_id is null then
      raise exception 'Compliance requirement not found for this asset';
    end if;
  else
    select id
    into resolved_requirement_id
    from public.compliance_requirements
    where company_id = owner_company_id
      and asset_id = inbox_job.asset_id
      and lower(compliance_type) = lower(trim(p_compliance_type))
      and archived_at is null
    order by created_at asc
    limit 1;
  end if;

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
      inbox_job.asset_id,
      trim(p_compliance_type),
      coalesce(p_reminder_days, 30),
      true
    )
    returning id into resolved_requirement_id;
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
    inbox_job.asset_id,
    resolved_requirement_id,
    trim(p_compliance_type),
    nullif(trim(coalesce(p_issuing_organization, '')), ''),
    nullif(trim(coalesce(p_identification_number, '')), ''),
    p_effective_date,
    p_expiration_date,
    coalesce(p_reminder_days, 30),
    nullif(trim(coalesce(p_notes, '')), '')
  );

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
    inbox_job.asset_id,
    p_record_id,
    coalesce(nullif(trim(p_document_name), ''), inbox_job.original_file_name),
    'compliance',
    trim(p_compliance_type),
    inbox_job.storage_bucket,
    inbox_job.storage_path,
    inbox_job.mime_type,
    inbox_job.file_size,
    p_effective_date,
    p_expiration_date,
    nullif(trim(coalesce(p_identification_number, '')), ''),
    'Compliance document completed from Asset Inbox.'
  );

  update public.ingestion_jobs
  set status = 'confirmed',
      corrected_data = coalesce(
        p_corrected_data,
        jsonb_build_object(
          'category', 'compliance',
          'complianceType', p_compliance_type,
          'expirationDate', p_expiration_date
        )
      ),
      created_record_type = 'compliance_record',
      created_record_id = p_record_id,
      completed_at = now()
  where id = p_job_id;

  insert into public.ingestion_job_events (
    ingestion_job_id,
    company_id,
    event_type,
    metadata
  )
  values (
    p_job_id,
    owner_company_id,
    'confirmed',
    jsonb_build_object(
      'createdRecordType', 'compliance_record',
      'createdRecordId', p_record_id
    )
  );

  return p_record_id;
end;
$$;

create or replace function public.complete_asset_inbox_document(
  p_job_id uuid,
  p_document_id uuid,
  p_document_name text,
  p_document_type text,
  p_issue_date date,
  p_expiration_date date,
  p_document_number text,
  p_notes text,
  p_corrected_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  inbox_job public.ingestion_jobs%rowtype;
begin
  select *
  into inbox_job
  from public.ingestion_jobs
  where id = p_job_id
    and company_id = owner_company_id
    and owner_id = auth.uid()
    and asset_id is not null
    and status not in ('confirmed', 'discarded')
  for update;

  if inbox_job.id is null then
    raise exception 'Asset Inbox item not found';
  end if;

  insert into public.documents (
    id,
    company_id,
    asset_id,
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
    p_document_id,
    owner_company_id,
    inbox_job.asset_id,
    coalesce(nullif(trim(p_document_name), ''), inbox_job.original_file_name),
    'asset',
    coalesce(nullif(trim(p_document_type), ''), 'Other'),
    inbox_job.storage_bucket,
    inbox_job.storage_path,
    inbox_job.mime_type,
    inbox_job.file_size,
    p_issue_date,
    p_expiration_date,
    nullif(trim(coalesce(p_document_number, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  );

  update public.ingestion_jobs
  set status = 'confirmed',
      corrected_data = coalesce(
        p_corrected_data,
        jsonb_build_object(
          'category', 'general',
          'documentType', p_document_type
        )
      ),
      created_record_type = 'document',
      created_record_id = p_document_id,
      completed_at = now()
  where id = p_job_id;

  insert into public.ingestion_job_events (
    ingestion_job_id,
    company_id,
    event_type,
    metadata
  )
  values (
    p_job_id,
    owner_company_id,
    'confirmed',
    jsonb_build_object(
      'createdRecordType', 'document',
      'createdRecordId', p_document_id
    )
  );

  return p_document_id;
end;
$$;

revoke all on function public.complete_asset_inbox_maintenance(
  uuid, uuid, uuid, text, date, numeric, numeric, text, numeric, numeric,
  numeric, numeric, text, text, text, jsonb
) from public;
grant execute on function public.complete_asset_inbox_maintenance(
  uuid, uuid, uuid, text, date, numeric, numeric, text, numeric, numeric,
  numeric, numeric, text, text, text, jsonb
) to authenticated;

revoke all on function public.complete_asset_inbox_compliance(
  uuid, uuid, uuid, text, text, text, date, date, integer, text, text, jsonb
) from public;
grant execute on function public.complete_asset_inbox_compliance(
  uuid, uuid, uuid, text, text, text, date, date, integer, text, text, jsonb
) to authenticated;

revoke all on function public.complete_asset_inbox_document(
  uuid, uuid, text, text, date, date, text, text, jsonb
) from public;
grant execute on function public.complete_asset_inbox_document(
  uuid, uuid, text, text, date, date, text, text, jsonb
) to authenticated;
