alter table public.subscription_records
  drop constraint if exists subscription_records_plan_key_allowed;

alter table public.subscription_records
  add constraint subscription_records_plan_key_allowed
  check (plan_key is null or plan_key in ('free', 'starter', 'small_fleet', 'growing_fleet'));

update public.subscription_records
set plan_key = case
      when asset_limit <= 1 then 'free'
      when asset_limit <= 5 then 'starter'
      when asset_limit <= 15 then 'small_fleet'
      else 'growing_fleet'
    end,
    updated_at = now()
where plan_key is null;

drop function if exists public.complete_company_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb
);

create or replace function public.complete_company_onboarding(
  p_company_name text,
  p_owner_name text,
  p_phone text,
  p_email text,
  p_address text,
  p_preferred_timezone text,
  p_preferred_measurement_settings jsonb,
  p_plan_key text default 'free'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  current_user_id uuid := auth.uid();
  selected_plan_key text;
  selected_asset_limit integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  selected_plan_key := coalesce(nullif(trim(p_plan_key), ''), 'free');

  selected_asset_limit := case selected_plan_key
    when 'free' then 1
    when 'starter' then 5
    when 'small_fleet' then 15
    when 'growing_fleet' then 30
    else null
  end;

  if selected_asset_limit is null then
    raise exception 'Choose a valid subscription plan.';
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
  values (new_company_id, 'trial', selected_asset_limit, selected_plan_key);

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
  jsonb,
  text
) from public;

grant execute on function public.complete_company_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text
) to authenticated;
