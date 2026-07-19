-- Run this once in your new, separate Supabase project's SQL Editor.
-- This project is intentionally independent of ReviewBusiness's own
-- database, single-user, no business/subscription concepts needed.

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  source text not null default 'other',
  contact_type text not null default 'phone',
  contact_value text,
  notes text,
  stage text not null default 'new',
  next_follow_up date,
  cold_email text,
  follow_up_email text,
  date_added timestamptz not null default now()
);

alter table leads enable row level security;

-- Simple, deliberately not per-user: this project only ever has one
-- real account, so "authenticated at all" is the only distinction
-- that matters, not row-level ownership.
create policy "Authenticated users can manage leads"
  on leads for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
