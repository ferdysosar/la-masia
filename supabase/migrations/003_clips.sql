create table if not exists public.clips (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  title text,
  description text,
  video_url text not null,
  created_at timestamptz not null default now()
);

alter table public.clips enable row level security;

drop policy if exists "clips_select_public" on public.clips;
create policy "clips_select_public"
on public.clips
for select
to public
using (true);

drop policy if exists "clips_insert_admin" on public.clips;
create policy "clips_insert_admin"
on public.clips
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "clips_delete_admin" on public.clips;
create policy "clips_delete_admin"
on public.clips
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

insert into storage.buckets (id, name, public)
values ('clips', 'clips', true)
on conflict (id) do nothing;

drop policy if exists "clips_storage_select_public" on storage.objects;
create policy "clips_storage_select_public"
on storage.objects
for select
to public
using (bucket_id = 'clips');

drop policy if exists "clips_storage_insert_admin" on storage.objects;
create policy "clips_storage_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'clips'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "clips_storage_delete_admin" on storage.objects;
create policy "clips_storage_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'clips'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
