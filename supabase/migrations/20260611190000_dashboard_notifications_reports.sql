begin;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email_enabled boolean not null default false,
  maintenance_reminder_days integer not null default 14 check (maintenance_reminder_days >= 0),
  compliance_reminder_days integer not null default 30 check (compliance_reminder_days >= 0),
  document_reminder_days integer not null default 30 check (document_reminder_days >= 0),
  weekly_summary_enabled boolean not null default false,
  preferred_summary_day integer not null default 1 check (preferred_summary_day between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_company_unique unique (company_id)
);

insert into public.notification_preferences (company_id)
select id
from public.companies
on conflict (company_id) do nothing;

drop trigger if exists notification_preferences_set_updated_at
on public.notification_preferences;

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notifications
  add column if not exists notification_key text;

update public.notifications
set notification_key = concat(notification_type::text, ':', related_entity_type, ':', related_entity_id::text)
where notification_key is null;

alter table public.notifications
  alter column notification_key set not null;

alter table public.notifications
  add column if not exists href text;

alter table public.notifications
  add column if not exists severity text not null default 'info';

alter table public.notifications
  add column if not exists resolved_at timestamptz;

alter table public.notifications
  add column if not exists last_generated_at timestamptz not null default now();

alter table public.notifications
  add column if not exists email_last_attempt_at timestamptz;

alter table public.notifications
  add column if not exists email_sent_at timestamptz;

alter table public.notifications
  add column if not exists email_attempt_count integer not null default 0 check (email_attempt_count >= 0);

alter table public.notifications
  add column if not exists email_error text;

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_key_not_blank'
  ) then
    alter table public.notifications
      add constraint notifications_key_not_blank
      check (length(trim(notification_key)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_severity_allowed'
  ) then
    alter table public.notifications
      add constraint notifications_severity_allowed
      check (severity in ('critical', 'warning', 'info'));
  end if;
end $$;

drop trigger if exists notifications_set_updated_at
on public.notifications;

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create unique index if not exists notifications_active_key_unique
on public.notifications (company_id, notification_key)
where resolved_at is null;

create index if not exists notifications_unread_idx
on public.notifications (company_id, read_at, created_at desc)
where resolved_at is null;

create index if not exists notifications_resolution_idx
on public.notifications (company_id, resolved_at, updated_at desc);

create index if not exists notifications_email_due_idx
on public.notifications (company_id, email_delivery_status, email_sent_at, created_at)
where resolved_at is null;

create index if not exists maintenance_records_company_created_idx
on public.maintenance_records (company_id, created_at desc);

create index if not exists documents_company_created_idx
on public.documents (company_id, created_at desc);

create index if not exists compliance_records_company_updated_idx
on public.compliance_records (company_id, updated_at desc);

create index if not exists assets_company_archived_idx
on public.assets (company_id, archived_at, status);

alter table public.notification_preferences enable row level security;
alter table public.notification_preferences force row level security;

drop policy if exists notification_preferences_owner_access
on public.notification_preferences;

create policy notification_preferences_owner_access
on public.notification_preferences for all
to authenticated
using (public.is_member_of_company(company_id))
with check (public.is_member_of_company(company_id));

commit;
