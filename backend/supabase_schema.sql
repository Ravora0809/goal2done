-- Run this in Supabase SQL Editor.
-- The backend uses the service-role key, so these tables are accessed server-side.

create table if not exists public.users (
  id text primary key,
  google_sub text unique not null,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_connections (
  user_id text primary key references public.users(id) on delete cascade,
  token_json text not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_google_sub on public.users(google_sub);

-- Keep RLS enabled for safety. The Goal2Done backend uses the Supabase
-- service-role key, which bypasses RLS. Never expose that key to React.
alter table public.users enable row level security;
alter table public.google_connections enable row level security;
