begin;

do $$
begin
  create type public.account_deletion_status as enum (
    'requested',
    'confirmed',
    'processing',
    'completed',
    'failed',
    'canceled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.account_deletion_status not null default 'requested',
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  canceled_at timestamptz,
  confirmation_text_hash text,
  failure_reason_internal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_deletion_confirmation_hash_shape
    check (confirmation_text_hash is null or confirmation_text_hash ~ '^[a-f0-9]{64}$'),
  constraint account_deletion_confirmed_at_required
    check (status <> 'confirmed' or confirmed_at is not null),
  constraint account_deletion_processing_at_required
    check (status <> 'processing' or processing_started_at is not null),
  constraint account_deletion_completed_at_required
    check (status <> 'completed' or completed_at is not null),
  constraint account_deletion_failed_at_required
    check (status <> 'failed' or failed_at is not null),
  constraint account_deletion_canceled_at_required
    check (status <> 'canceled' or canceled_at is not null)
);

drop trigger if exists account_deletion_requests_set_updated_at
on public.account_deletion_requests;

create trigger account_deletion_requests_set_updated_at
before update on public.account_deletion_requests
for each row execute function public.set_updated_at();

create index if not exists account_deletion_requests_company_idx
on public.account_deletion_requests (company_id, requested_at desc);

create index if not exists account_deletion_requests_owner_idx
on public.account_deletion_requests (owner_id, requested_at desc);

create index if not exists account_deletion_requests_status_idx
on public.account_deletion_requests (status, requested_at desc);

create unique index if not exists account_deletion_requests_one_active_per_company
on public.account_deletion_requests (company_id)
where status in ('requested', 'confirmed', 'processing');

alter table public.account_deletion_requests enable row level security;
alter table public.account_deletion_requests force row level security;

drop policy if exists account_deletion_requests_owner_select
on public.account_deletion_requests;

create policy account_deletion_requests_owner_select
on public.account_deletion_requests for select
to authenticated
using (public.is_member_of_company(company_id));

drop policy if exists account_deletion_requests_owner_insert
on public.account_deletion_requests;

create policy account_deletion_requests_owner_insert
on public.account_deletion_requests for insert
to authenticated
with check (
  public.is_member_of_company(company_id)
  and owner_id = auth.uid()
  and status in ('requested', 'confirmed')
);

commit;
