alter type public.subscription_status add value if not exists 'trialing';
alter type public.subscription_status add value if not exists 'unpaid';
alter type public.subscription_status add value if not exists 'incomplete_expired';
alter type public.subscription_status add value if not exists 'paused';

alter table public.subscription_records
  add column if not exists plan_key text,
  add column if not exists current_period_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists last_payment_status text,
  add column if not exists restricted_at timestamptz,
  add column if not exists updated_from_stripe_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.subscription_records
  alter column asset_limit set default 5;

alter table public.subscription_records
  drop constraint if exists subscription_records_plan_key_allowed;

alter table public.subscription_records
  add constraint subscription_records_plan_key_allowed
  check (plan_key is null or plan_key in ('starter', 'small_fleet', 'growing_fleet'));

create index if not exists subscription_records_status_idx
on public.subscription_records (status);

create index if not exists subscription_records_plan_key_idx
on public.subscription_records (plan_key);

create index if not exists subscription_records_current_period_end_idx
on public.subscription_records (current_period_end);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  api_version text,
  livemode boolean not null default false,
  company_id uuid references public.companies(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint stripe_events_type_not_blank check (length(trim(type)) > 0)
);

alter table public.stripe_events enable row level security;
alter table public.stripe_events force row level security;

revoke all on public.stripe_events from anon, authenticated;
grant select, insert, update on public.stripe_events to service_role;

create index if not exists stripe_events_company_id_idx
on public.stripe_events (company_id);

create index if not exists stripe_events_customer_idx
on public.stripe_events (stripe_customer_id);

create index if not exists stripe_events_subscription_idx
on public.stripe_events (stripe_subscription_id);

create index if not exists stripe_events_type_created_idx
on public.stripe_events (type, created_at desc);

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

  insert into public.subscription_records (company_id, status, asset_limit, plan_key)
  values (new_company_id, 'trial', 5, 'starter');

  return new_company_id;
end;
$$;

create or replace function public.enforce_active_asset_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_subscription_status public.subscription_status;
  owner_asset_limit integer;
  active_asset_count integer;
begin
  if new.status <> 'active' or new.archived_at is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'active' and old.archived_at is null then
    return new;
  end if;

  select status, asset_limit
  into owner_subscription_status, owner_asset_limit
  from public.subscription_records
  where company_id = new.company_id;

  owner_subscription_status := coalesce(owner_subscription_status, 'incomplete');
  owner_asset_limit := coalesce(owner_asset_limit, 5);

  if owner_subscription_status::text not in ('trial', 'trialing', 'active') then
    raise exception 'Subscription status does not allow creating or reactivating active assets.'
      using errcode = 'check_violation';
  end if;

  select count(*)
  into active_asset_count
  from public.assets
  where company_id = new.company_id
    and status = 'active'
    and archived_at is null
    and (tg_op <> 'UPDATE' or id <> old.id);

  if active_asset_count >= owner_asset_limit then
    raise exception 'Active asset limit reached for the current subscription plan.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists assets_active_asset_limit on public.assets;

create trigger assets_active_asset_limit
before insert or update of status, archived_at
on public.assets
for each row
execute function public.enforce_active_asset_limit();
