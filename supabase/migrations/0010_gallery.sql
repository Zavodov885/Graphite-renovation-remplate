-- Публичная галерея «как делается ремонт». Отдельный публичный бакет: фото из приватных заказов сюда не попадают.
create table if not exists gallery_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services on delete set null,
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 500),
  stage text not null check (stage in ('before','during','after')),
  storage_path text not null unique,
  is_published boolean not null default true,
  created_at timestamptz not null default now());
create index if not exists gallery_service_idx on gallery_items(service_id);
alter table gallery_items enable row level security;
drop policy if exists gal_read on gallery_items;
drop policy if exists gal_write on gallery_items;
create policy gal_read on gallery_items for select using (is_published or is_staff());
create policy gal_write on gallery_items for all using (is_staff()) with check (is_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('gallery','gallery',true,10485760,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
drop policy if exists gallery_staff_insert on storage.objects;
drop policy if exists gallery_staff_delete on storage.objects;
create policy gallery_staff_insert on storage.objects for insert with check (bucket_id='gallery' and is_staff());
create policy gallery_staff_delete on storage.objects for delete using (bucket_id='gallery' and is_staff());
