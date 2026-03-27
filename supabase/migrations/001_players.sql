create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);
