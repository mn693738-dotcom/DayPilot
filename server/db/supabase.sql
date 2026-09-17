-- Run this file once in the Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  profile jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_login timestamptz,
  last_active_at timestamptz
);

create table if not exists public.account_data (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.account_sessions (
  token_hash text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  expires_at timestamptz not null
);

alter table public.accounts enable row level security;
alter table public.account_data enable row level security;
alter table public.account_sessions enable row level security;
