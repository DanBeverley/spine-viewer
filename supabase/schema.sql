-- Run this in Supabase Dashboard -> SQL Editor.
create table if not exists public.spine_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_key text not null,
  name text not null,
  files jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, asset_key)
);

alter table public.spine_assets enable row level security;

grant select, insert, update, delete on public.spine_assets to authenticated;

create policy "Users can read their own Spine assets"
  on public.spine_assets for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can create their own Spine assets"
  on public.spine_assets for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own Spine assets"
  on public.spine_assets for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own Spine assets"
  on public.spine_assets for delete to authenticated
  using ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public)
values ('spine-assets', 'spine-assets', false)
on conflict (id) do nothing;

create policy "Users can read their own Spine files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'spine-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload their own Spine files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'spine-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can update their own Spine files"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'spine-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'spine-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their own Spine files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'spine-assets'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
