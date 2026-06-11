begin;

alter table public.maintenance_records
  add column if not exists archived_at timestamptz;

create index if not exists maintenance_records_archived_at_idx
on public.maintenance_records (company_id, archived_at);

insert into public.maintenance_templates (
  company_id,
  name,
  description,
  default_mileage_interval,
  default_hour_interval,
  default_calendar_interval_days,
  is_active
)
values
  (null, 'Engine oil and filter', 'Recurring engine oil and filter preventive service.', 5000, 250, 180, true),
  (null, 'Fuel filter', 'Fuel filter service interval.', 15000, 500, 365, true),
  (null, 'Air filter', 'Air intake filter service interval.', 12000, 400, 365, true),
  (null, 'Transmission service', 'Transmission fluid and service interval.', 30000, null, 730, true),
  (null, 'Differential service', 'Differential fluid service interval.', 30000, null, 730, true),
  (null, 'Hydraulic service', 'Hydraulic system service interval for equipment.', null, 500, 365, true),
  (null, 'Coolant service', 'Cooling-system preventive maintenance interval.', 30000, 1000, 730, true),
  (null, 'Brake inspection', 'Brake system inspection interval.', 10000, null, 180, true),
  (null, 'Tire inspection', 'Tire condition and pressure inspection interval.', 5000, null, 90, true),
  (null, 'Tire replacement', 'Owner-planned tire replacement interval.', 50000, null, 1095, true),
  (null, 'Battery replacement', 'Owner-planned battery replacement interval.', null, null, 1095, true),
  (null, 'Greasing', 'Chassis or equipment grease service interval.', 2500, 100, 90, true),
  (null, 'Annual preventive maintenance', 'Annual owner preventive maintenance review.', null, null, 365, true),
  (null, 'Custom maintenance item', 'Starting point for owner-defined maintenance rules.', null, null, 365, true)
on conflict do nothing;

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
  bigint
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
  bigint
) to authenticated;

commit;
