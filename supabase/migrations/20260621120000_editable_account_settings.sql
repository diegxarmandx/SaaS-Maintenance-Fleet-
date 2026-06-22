create or replace function public.update_owner_profile_name(p_full_name text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  owner_company_id uuid;
  normalized_name text := trim(p_full_name);
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if length(normalized_name) < 2 or length(normalized_name) > 160 then
    raise exception 'Owner name is invalid' using errcode = '22023';
  end if;

  select company_id
  into owner_company_id
  from public.profiles
  where id = owner_id
    and onboarding_status = 'complete';

  if owner_company_id is null then
    raise exception 'Owner company not found' using errcode = '42501';
  end if;

  update public.profiles
  set full_name = normalized_name
  where id = owner_id;

  if not found then
    raise exception 'Owner profile not found' using errcode = '42501';
  end if;

  update public.companies
  set owner_name = normalized_name
  where id = owner_company_id;

  if not found then
    raise exception 'Owner company not found' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_owner_profile_name(text) from public;
grant execute on function public.update_owner_profile_name(text) to authenticated;
