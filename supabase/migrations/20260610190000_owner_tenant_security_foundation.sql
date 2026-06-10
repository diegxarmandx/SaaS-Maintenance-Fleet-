begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.onboarding_status as enum ('incomplete', 'complete');
create type public.asset_type as enum ('vehicle', 'trailer', 'equipment');
create type public.asset_status as enum ('active', 'inactive', 'archived');
create type public.meter_reading_type as enum ('mileage', 'engine_hours');
create type public.compliance_status as enum ('active', 'expiring', 'expired', 'waived');
create type public.document_category as enum (
  'asset',
  'maintenance',
  'compliance',
  'general'
);
create type public.notification_type as enum (
  'maintenance_due',
  'compliance_expiration',
  'document_expiration',
  'general'
);
create type public.email_delivery_status as enum (
  'not_queued',
  'queued',
  'sent',
  'failed',
  'skipped'
);
create type public.subscription_status as enum (
  'trial',
  'active',
  'past_due',
  'canceled',
  'incomplete'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(trim(company_name)) > 0),
  owner_name text not null check (length(trim(owner_name)) > 0),
  phone text,
  email citext not null,
  address text,
  preferred_timezone text not null default 'UTC',
  preferred_measurement_settings jsonb not null default '{"distanceUnit":"miles","engineHourTracking":true}'::jsonb,
  subscription_status public.subscription_status not null default 'trial',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_email_not_blank check (length(trim(email::text)) > 0)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email citext not null,
  company_id uuid references public.companies(id) on delete set null,
  onboarding_status public.onboarding_status not null default 'incomplete',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_not_blank check (length(trim(email::text)) > 0)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  unit_number text not null,
  asset_name text not null,
  asset_type public.asset_type not null,
  year integer check (year is null or year between 1900 and 2100),
  make text,
  model text,
  vin_or_serial_number text,
  license_plate text,
  current_mileage numeric(14, 2) not null default 0 check (current_mileage >= 0),
  current_engine_hours numeric(14, 2) not null default 0 check (current_engine_hours >= 0),
  purchase_date date,
  purchase_price numeric(12, 2) check (purchase_price is null or purchase_price >= 0),
  status public.asset_status not null default 'active',
  notes text,
  asset_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint assets_unit_number_not_blank check (length(trim(unit_number)) > 0),
  constraint assets_name_not_blank check (length(trim(asset_name)) > 0)
);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  reading_type public.meter_reading_type not null,
  reading_value numeric(14, 2) not null check (reading_value >= 0),
  reading_date timestamptz not null default now(),
  notes text,
  is_correction boolean not null default false,
  created_at timestamptz not null default now(),
  constraint meter_readings_correction_requires_note check (
    is_correction = false
    or notes is not null
    and length(trim(notes)) > 0
  )
);

create table public.maintenance_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text,
  default_mileage_interval numeric(14, 2) check (
    default_mileage_interval is null or default_mileage_interval > 0
  ),
  default_hour_interval numeric(14, 2) check (
    default_hour_interval is null or default_hour_interval > 0
  ),
  default_calendar_interval_days integer check (
    default_calendar_interval_days is null or default_calendar_interval_days > 0
  ),
  is_active boolean not null default true,
  constraint maintenance_templates_name_not_blank check (length(trim(name)) > 0),
  constraint maintenance_templates_has_interval check (
    default_mileage_interval is not null
    or default_hour_interval is not null
    or default_calendar_interval_days is not null
  )
);

create table public.maintenance_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  template_id uuid references public.maintenance_templates(id) on delete set null,
  name text not null,
  description text,
  mileage_interval numeric(14, 2) check (mileage_interval is null or mileage_interval > 0),
  hour_interval numeric(14, 2) check (hour_interval is null or hour_interval > 0),
  calendar_interval_days integer check (
    calendar_interval_days is null or calendar_interval_days > 0
  ),
  last_completed_date date,
  last_completed_mileage numeric(14, 2) check (
    last_completed_mileage is null or last_completed_mileage >= 0
  ),
  last_completed_hours numeric(14, 2) check (
    last_completed_hours is null or last_completed_hours >= 0
  ),
  next_due_date date,
  next_due_mileage numeric(14, 2) check (next_due_mileage is null or next_due_mileage >= 0),
  next_due_hours numeric(14, 2) check (next_due_hours is null or next_due_hours >= 0),
  reminder_mileage numeric(14, 2) check (reminder_mileage is null or reminder_mileage >= 0),
  reminder_hours numeric(14, 2) check (reminder_hours is null or reminder_hours >= 0),
  reminder_days integer not null default 14 check (reminder_days >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_rules_name_not_blank check (length(trim(name)) > 0),
  constraint maintenance_rules_has_interval check (
    mileage_interval is not null
    or hour_interval is not null
    or calendar_interval_days is not null
  )
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  maintenance_rule_id uuid references public.maintenance_rules(id) on delete set null,
  maintenance_type text not null,
  completion_date date not null,
  mileage numeric(14, 2) check (mileage is null or mileage >= 0),
  engine_hours numeric(14, 2) check (engine_hours is null or engine_hours >= 0),
  service_provider text,
  parts_cost numeric(12, 2) not null default 0 check (parts_cost >= 0),
  labor_cost numeric(12, 2) not null default 0 check (labor_cost >= 0),
  other_cost numeric(12, 2) not null default 0 check (other_cost >= 0),
  total_cost numeric(12, 2) generated always as (parts_cost + labor_cost + other_cost) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_records_type_not_blank check (length(trim(maintenance_type)) > 0)
);

create table public.compliance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  compliance_type text not null,
  issuing_organization text,
  identification_number text,
  effective_date date,
  expiration_date date not null,
  reminder_days integer not null default 30 check (reminder_days >= 0),
  status_override public.compliance_status,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compliance_records_type_not_blank check (length(trim(compliance_type)) > 0)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  maintenance_record_id uuid references public.maintenance_records(id) on delete set null,
  compliance_record_id uuid references public.compliance_records(id) on delete set null,
  document_name text not null,
  category public.document_category not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  issue_date date,
  expiration_date date,
  document_number text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_name_not_blank check (length(trim(document_name)) > 0),
  constraint documents_storage_path_not_blank check (length(trim(storage_path)) > 0)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  notification_type public.notification_type not null,
  related_entity_type text not null,
  related_entity_id uuid not null,
  title text not null,
  message text not null,
  due_date date,
  read_at timestamptz,
  email_delivery_status public.email_delivery_status not null default 'not_queued',
  created_at timestamptz not null default now(),
  constraint notifications_title_not_blank check (length(trim(title)) > 0),
  constraint notifications_message_not_blank check (length(trim(message)) > 0)
);

create table public.subscription_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  status public.subscription_status not null default 'trial',
  current_period_end timestamptz,
  asset_limit integer not null default 25 check (asset_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger assets_set_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

create trigger maintenance_rules_set_updated_at
before update on public.maintenance_rules
for each row execute function public.set_updated_at();

create trigger maintenance_records_set_updated_at
before update on public.maintenance_records
for each row execute function public.set_updated_at();

create trigger compliance_records_set_updated_at
before update on public.compliance_records
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create trigger subscription_records_set_updated_at
before update on public.subscription_records
for each row execute function public.set_updated_at();

create unique index profiles_email_unique on public.profiles (email);
create index profiles_company_id_idx on public.profiles (company_id);
create index companies_email_idx on public.companies (email);

create unique index assets_company_unit_number_active_unique
on public.assets (company_id, lower(unit_number))
where archived_at is null;
create index assets_company_id_idx on public.assets (company_id);
create index assets_status_idx on public.assets (company_id, status);

create index meter_readings_company_id_idx on public.meter_readings (company_id);
create index meter_readings_asset_id_idx on public.meter_readings (asset_id);
create index meter_readings_asset_date_idx on public.meter_readings (asset_id, reading_date desc);

create index maintenance_templates_company_id_idx on public.maintenance_templates (company_id);
create unique index maintenance_templates_system_name_unique
on public.maintenance_templates (lower(name))
where company_id is null;
create unique index maintenance_templates_company_name_unique
on public.maintenance_templates (company_id, lower(name))
where company_id is not null;

create index maintenance_rules_company_id_idx on public.maintenance_rules (company_id);
create index maintenance_rules_asset_id_idx on public.maintenance_rules (asset_id);
create index maintenance_rules_due_date_idx on public.maintenance_rules (company_id, next_due_date);
create index maintenance_rules_due_mileage_idx on public.maintenance_rules (asset_id, next_due_mileage);
create index maintenance_rules_due_hours_idx on public.maintenance_rules (asset_id, next_due_hours);

create index maintenance_records_company_id_idx on public.maintenance_records (company_id);
create index maintenance_records_asset_id_idx on public.maintenance_records (asset_id);
create index maintenance_records_completion_date_idx
on public.maintenance_records (company_id, completion_date desc);

create index compliance_records_company_id_idx on public.compliance_records (company_id);
create index compliance_records_asset_id_idx on public.compliance_records (asset_id);
create index compliance_records_expiration_date_idx
on public.compliance_records (company_id, expiration_date);

create index documents_company_id_idx on public.documents (company_id);
create index documents_asset_id_idx on public.documents (asset_id);
create index documents_expiration_date_idx on public.documents (company_id, expiration_date);
create unique index documents_company_storage_path_unique
on public.documents (company_id, storage_path);

create index notifications_company_id_idx on public.notifications (company_id);
create index notifications_asset_id_idx on public.notifications (asset_id);
create index notifications_due_date_idx on public.notifications (company_id, due_date);
create index notifications_status_idx
on public.notifications (company_id, read_at, email_delivery_status);

create unique index subscription_records_company_unique
on public.subscription_records (company_id);
create unique index subscription_records_stripe_customer_unique
on public.subscription_records (stripe_customer_id)
where stripe_customer_id is not null;
create unique index subscription_records_stripe_subscription_unique
on public.subscription_records (stripe_subscription_id)
where stripe_subscription_id is not null;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.is_member_of_company(company_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select company_uuid is not null
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and company_id = company_uuid
        and onboarding_status = 'complete'
    )
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, onboarding_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'incomplete'
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.complete_company_onboarding(
  p_company_name text,
  p_owner_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_preferred_timezone text,
  p_preferred_measurement_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = current_user_id
      and company_id is not null
      and onboarding_status = 'complete'
  ) then
    raise exception 'Owner onboarding is already complete';
  end if;

  insert into public.companies (
    company_name,
    owner_name,
    phone,
    email,
    address,
    preferred_timezone,
    preferred_measurement_settings
  )
  values (
    trim(p_company_name),
    trim(p_owner_name),
    nullif(trim(p_phone), ''),
    trim(p_email)::citext,
    nullif(trim(p_address), ''),
    coalesce(nullif(trim(p_preferred_timezone), ''), 'UTC'),
    coalesce(p_preferred_measurement_settings, '{"distanceUnit":"miles","engineHourTracking":true}'::jsonb)
  )
  returning id into new_company_id;

  insert into public.profiles (
    id,
    full_name,
    email,
    company_id,
    onboarding_status
  )
  values (
    current_user_id,
    trim(p_owner_name),
    trim(p_email)::citext,
    new_company_id,
    'complete'
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      company_id = excluded.company_id,
      onboarding_status = 'complete',
      updated_at = now();

  insert into public.subscription_records (company_id, status, asset_limit)
  values (new_company_id, 'trial', 25);

  return new_company_id;
end;
$$;

revoke all on function public.complete_company_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) from public;
grant execute on function public.complete_company_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
) to authenticated;

create or replace function public.apply_meter_reading_to_asset()
returns trigger
language plpgsql
as $$
declare
  asset_record public.assets%rowtype;
begin
  select *
  into asset_record
  from public.assets
  where id = new.asset_id
  for update;

  if asset_record.id is null then
    raise exception 'Asset not found';
  end if;

  if asset_record.company_id <> new.company_id then
    raise exception 'Meter reading company does not match asset company';
  end if;

  if new.reading_type = 'mileage' then
    if new.reading_value < asset_record.current_mileage and new.is_correction = false then
      raise exception 'Mileage readings cannot decrease without an explicit correction';
    end if;

    update public.assets
    set current_mileage = new.reading_value
    where id = new.asset_id;
  end if;

  if new.reading_type = 'engine_hours' then
    if new.reading_value < asset_record.current_engine_hours and new.is_correction = false then
      raise exception 'Engine-hour readings cannot decrease without an explicit correction';
    end if;

    update public.assets
    set current_engine_hours = new.reading_value
    where id = new.asset_id;
  end if;

  return new;
end;
$$;

create trigger meter_readings_apply_to_asset
before insert on public.meter_readings
for each row execute function public.apply_meter_reading_to_asset();

alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.assets enable row level security;
alter table public.meter_readings enable row level security;
alter table public.maintenance_templates enable row level security;
alter table public.maintenance_rules enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.compliance_records enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.subscription_records enable row level security;

alter table public.profiles force row level security;
alter table public.companies force row level security;
alter table public.assets force row level security;
alter table public.meter_readings force row level security;
alter table public.maintenance_templates force row level security;
alter table public.maintenance_rules force row level security;
alter table public.maintenance_records force row level security;
alter table public.compliance_records force row level security;
alter table public.documents force row level security;
alter table public.notifications force row level security;
alter table public.subscription_records force row level security;

create policy profiles_select_self
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy companies_owner_access
on public.companies for all
to authenticated
using (public.is_member_of_company(id))
with check (public.is_member_of_company(id));

create policy assets_owner_access
on public.assets for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy meter_readings_owner_access
on public.meter_readings for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy maintenance_templates_select_owner_or_system
on public.maintenance_templates for select
to authenticated
using (company_id is null or public.is_member_of_company(company_id));

create policy maintenance_templates_insert_owner
on public.maintenance_templates for insert
to authenticated
with check (company_id is not null and public.is_member_of_company(company_id));

create policy maintenance_templates_update_owner
on public.maintenance_templates for update
to authenticated
using (company_id is not null and public.is_member_of_company(company_id))
with check (company_id is not null and public.is_member_of_company(company_id));

create policy maintenance_templates_delete_owner
on public.maintenance_templates for delete
to authenticated
using (company_id is not null and public.is_member_of_company(company_id));

create policy maintenance_rules_owner_access
on public.maintenance_rules for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy maintenance_records_owner_access
on public.maintenance_records for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy compliance_records_owner_access
on public.compliance_records for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy documents_owner_access
on public.documents for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy notifications_owner_access
on public.notifications for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

create policy subscription_records_owner_access
on public.subscription_records for select
to authenticated
using (public.is_member_of_company(company_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('asset-images', 'asset-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('maintenance-attachments', 'maintenance-attachments', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('compliance-documents', 'compliance-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('fleet-documents', 'fleet-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy storage_company_select
on storage.objects for select
to authenticated
using (
  bucket_id in (
    'asset-images',
    'maintenance-attachments',
    'compliance-documents',
    'fleet-documents'
  )
  and public.is_member_of_company(((storage.foldername(name))[1])::uuid)
);

create policy storage_company_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id in (
    'asset-images',
    'maintenance-attachments',
    'compliance-documents',
    'fleet-documents'
  )
  and public.is_member_of_company(((storage.foldername(name))[1])::uuid)
);

create policy storage_company_update
on storage.objects for update
to authenticated
using (
  bucket_id in (
    'asset-images',
    'maintenance-attachments',
    'compliance-documents',
    'fleet-documents'
  )
  and public.is_member_of_company(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id in (
    'asset-images',
    'maintenance-attachments',
    'compliance-documents',
    'fleet-documents'
  )
  and public.is_member_of_company(((storage.foldername(name))[1])::uuid)
);

create policy storage_company_delete
on storage.objects for delete
to authenticated
using (
  bucket_id in (
    'asset-images',
    'maintenance-attachments',
    'compliance-documents',
    'fleet-documents'
  )
  and public.is_member_of_company(((storage.foldername(name))[1])::uuid)
);

commit;
