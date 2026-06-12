begin;

alter table public.notification_preferences
  add column if not exists email_warning_enabled boolean not null default true;

alter table public.notification_preferences
  add column if not exists email_critical_enabled boolean not null default true;

alter table public.notification_preferences
  add column if not exists quiet_hours_start time;

alter table public.notification_preferences
  add column if not exists quiet_hours_end time;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notification_preferences_quiet_hours_pair'
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_quiet_hours_pair
      check (
        (quiet_hours_start is null and quiet_hours_end is null)
        or (quiet_hours_start is not null and quiet_hours_end is not null)
      );
  end if;
end $$;

create table if not exists public.report_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  default_asset_id uuid references public.assets(id) on delete set null,
  default_lookback_days integer not null default 90 check (
    default_lookback_days >= 0 and default_lookback_days <= 3650
  ),
  show_charts_by_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_preferences_company_unique unique (company_id)
);

insert into public.report_preferences (company_id)
select id
from public.companies
on conflict (company_id) do nothing;

drop trigger if exists report_preferences_set_updated_at
on public.report_preferences;

create trigger report_preferences_set_updated_at
before update on public.report_preferences
for each row execute function public.set_updated_at();

create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null check (file_size >= 0),
  change_reason text not null default 'upload',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint document_versions_company_document_version_unique
    unique (company_id, document_id, version_number),
  constraint document_versions_storage_path_unique unique (company_id, storage_path),
  constraint document_versions_storage_path_company_scope
    check (split_part(storage_path, '/', 1) = company_id::text),
  constraint document_versions_change_reason_allowed
    check (change_reason in ('upload', 'replacement', 'metadata_import'))
);

insert into public.document_versions (
  company_id,
  document_id,
  version_number,
  storage_bucket,
  storage_path,
  mime_type,
  file_size,
  change_reason,
  created_at
)
select
  company_id,
  id,
  1,
  storage_bucket,
  storage_path,
  mime_type,
  file_size,
  'metadata_import',
  created_at
from public.documents
where storage_path is not null
on conflict (company_id, document_id, version_number) do nothing;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_events_event_type_not_blank
    check (length(trim(event_type)) > 0),
  constraint audit_events_entity_type_not_blank
    check (length(trim(entity_type)) > 0)
);

create index if not exists report_preferences_company_idx
on public.report_preferences (company_id);

create index if not exists document_versions_company_document_idx
on public.document_versions (company_id, document_id, version_number desc);

create index if not exists document_versions_created_idx
on public.document_versions (company_id, created_at desc);

create index if not exists audit_events_company_created_idx
on public.audit_events (company_id, created_at desc);

create index if not exists audit_events_entity_idx
on public.audit_events (company_id, entity_type, entity_id, created_at desc);

alter table public.report_preferences enable row level security;
alter table public.report_preferences force row level security;

alter table public.document_versions enable row level security;
alter table public.document_versions force row level security;

alter table public.audit_events enable row level security;
alter table public.audit_events force row level security;

drop policy if exists report_preferences_owner_access
on public.report_preferences;

create policy report_preferences_owner_access
on public.report_preferences for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

drop policy if exists document_versions_owner_access
on public.document_versions;

create policy document_versions_owner_access
on public.document_versions for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

drop policy if exists audit_events_owner_select
on public.audit_events;

create policy audit_events_owner_select
on public.audit_events for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists audit_events_owner_insert
on public.audit_events;

create policy audit_events_owner_insert
on public.audit_events for insert
to authenticated
with check (public.is_member_of_company(company_id));

commit;
