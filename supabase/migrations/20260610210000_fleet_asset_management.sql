begin;

alter table public.assets
  alter column asset_type type text
  using asset_type::text;

alter table public.assets
  add constraint assets_asset_type_not_blank
  check (length(trim(asset_type)) > 0);

create or replace function public.create_meter_reading_for_asset(
  p_asset_id uuid,
  p_reading_type public.meter_reading_type,
  p_reading_value numeric,
  p_reading_date timestamptz,
  p_notes text default null,
  p_is_correction boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_company_id uuid := public.current_company_id();
  new_reading_id uuid;
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

  insert into public.meter_readings (
    company_id,
    asset_id,
    reading_type,
    reading_value,
    reading_date,
    notes,
    is_correction
  )
  values (
    owner_company_id,
    p_asset_id,
    p_reading_type,
    p_reading_value,
    p_reading_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(p_is_correction, false)
  )
  returning id into new_reading_id;

  return new_reading_id;
end;
$$;

revoke all on function public.create_meter_reading_for_asset(
  uuid,
  public.meter_reading_type,
  numeric,
  timestamptz,
  text,
  boolean
) from public;

grant execute on function public.create_meter_reading_for_asset(
  uuid,
  public.meter_reading_type,
  numeric,
  timestamptz,
  text,
  boolean
) to authenticated;

commit;
