-- Graphite Renovation: схема, RLS, RPC. Применять: supabase db push
create extension if not exists pgcrypto;
create type user_role as enum ('client','master','manager','admin');
create type order_status as enum ('new','under_review','awaiting_approval','master_assigned','in_progress','awaiting_extra_work_approval','completed','cancelled');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default '', phone text,
  role user_role not null default 'client',
  is_blocked boolean not null default false,
  contact_telegram text, contact_max text, contact_whatsapp text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());

-- Публичная регистрация ВСЕГДА создаёт клиента; метаданные Auth не читаются для роли.
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create function app_role() returns user_role language sql stable security definer set search_path=public as $$
  select role from profiles where id=auth.uid() and not is_blocked $$;
create function is_staff() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(app_role() in ('manager','admin'), false) $$;
create function is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select coalesce(app_role()='admin', false) $$;

create function profiles_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.is_blocked<>old.is_blocked or new.id<>old.id) then
    raise exception 'privileged fields are admin-only'; end if;
  new.updated_at=now(); return new; end $$;
create trigger profiles_guard_t before update on profiles for each row execute function profiles_guard();

create table service_categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, sort int not null default 0, is_published boolean not null default true);
create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories, name text not null, slug text not null unique, description text,
  unit text not null check (unit in ('m2','m','pcs','fixed')),
  base_price numeric(12,2) not null check (base_price>=0), price_note text, material_included boolean,
  is_published boolean not null default false, is_archived boolean not null default false);

create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles, category_id uuid references service_categories,
  title text not null check (char_length(title) between 3 and 200),
  description text check (char_length(description)<=5000), address text not null,
  contact_name text not null, contact_phone text not null, preferred_date date,
  status order_status not null default 'new',
  calc_snapshot jsonb, calc_total numeric(12,2) check (calc_total>=0),
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (client_id, idempotency_key));
create index on orders(status, created_at desc); create index on orders(client_id);

create table order_assignments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade,
  master_id uuid not null references profiles, assigned_by uuid not null references profiles,
  started_at timestamptz not null default now(), ended_at timestamptz);
create unique index one_active_assignment on order_assignments(order_id) where ended_at is null;
create index on order_assignments(master_id) where ended_at is null;

create function owns_order(p uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from orders where id=p and client_id=auth.uid()) and app_role()='client' $$;
create function is_assigned_master(p uuid) returns boolean language sql stable security definer set search_path=public as $$
  select app_role()='master' and exists(select 1 from order_assignments where order_id=p and master_id=auth.uid() and ended_at is null) $$;
create function can_see_order(p uuid) returns boolean language sql stable as $$ select is_staff() or owns_order(p) or is_assigned_master(p) $$;

create table order_status_history (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, from_status order_status, to_status order_status not null, actor_id uuid references profiles, reason text, created_at timestamptz not null default now());
create table order_estimates (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, version int not null,
  status text not null default 'draft' check (status in ('draft','awaiting_approval','approved','rejected','superseded')),
  total numeric(12,2) not null default 0, snapshot jsonb, created_by uuid not null references profiles, approved_at timestamptz,
  created_at timestamptz not null default now(), unique(order_id, version));
create table estimate_items (
  id uuid primary key default gen_random_uuid(), estimate_id uuid not null references order_estimates on delete cascade,
  service_id uuid references services, description text not null, unit text not null,
  qty numeric(12,3) not null check (qty>=0), unit_price numeric(12,2) not null check (unit_price>=0),
  line_total numeric(12,2) generated always as (round(qty*unit_price,2)) stored, note text);
create table extra_work_proposals (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, proposed_by uuid not null references profiles,
  description text not null, qty numeric(12,3) not null check (qty>0), price numeric(12,2) not null check (price>=0), reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references profiles, decided_at timestamptz, created_at timestamptz not null default now());
create table order_attachments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, uploaded_by uuid not null references profiles,
  stage text not null check (stage in ('client','before','during','after')), storage_path text not null unique, caption text, created_at timestamptz not null default now());
create table reviews (
  id uuid primary key default gen_random_uuid(), order_id uuid not null unique references orders, client_id uuid not null references profiles,
  rating int not null check (rating between 1 and 5), body text check (char_length(body)<=3000),
  status text not null default 'pending' check (status in ('pending','approved','hidden')), created_at timestamptz not null default now());
create table consents (id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles, doc_type text not null, doc_version text not null, accepted_at timestamptz not null default now());
create table audit_logs (id uuid primary key default gen_random_uuid(), actor_id uuid, action text not null, entity text not null, entity_id uuid, meta jsonb, created_at timestamptz not null default now());
create table manager_notes (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders on delete cascade, author_id uuid not null references profiles, body text not null, created_at timestamptz not null default now());

-- Статус меняется ТОЛЬКО через RPC
create function orders_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and (new.status<>old.status or new.client_id<>old.client_id) and coalesce(current_setting('app.status_rpc',true),'')<>'1' then
    raise exception 'status/owner change not allowed directly'; end if;
  new.updated_at=now(); return new; end $$;
create trigger orders_guard_t before update on orders for each row execute function orders_guard();

create function transition_allowed(f order_status, t order_status, r user_role) returns boolean language sql immutable as $$
  select case
   when r in ('manager','admin') then (f,t) in (('new','under_review'),('new','cancelled'),('under_review','awaiting_approval'),('under_review','master_assigned'),('under_review','cancelled'),
     ('awaiting_approval','under_review'),('awaiting_approval','master_assigned'),('awaiting_approval','cancelled'),('master_assigned','in_progress'),('master_assigned','cancelled'),
     ('in_progress','awaiting_extra_work_approval'),('in_progress','completed'),('in_progress','cancelled'),('awaiting_extra_work_approval','in_progress'),('awaiting_extra_work_approval','cancelled'))
   when r='master' then (f,t) in (('master_assigned','in_progress'),('in_progress','awaiting_extra_work_approval'))
   when r='client' then (f,t) in (('new','cancelled'),('awaiting_extra_work_approval','in_progress'))
   else false end $$;

create function change_order_status(p_order uuid, p_new order_status, p_reason text default null) returns void language plpgsql security definer set search_path=public as $$
declare cur order_status; r user_role := app_role();
begin
  if r is null or not can_see_order(p_order) then raise exception 'access denied'; end if;
  select status into cur from orders where id=p_order for update;
  if not transition_allowed(cur,p_new,r) then raise exception 'transition % -> % not allowed for %',cur,p_new,r; end if;
  if p_new='cancelled' and coalesce(trim(p_reason),'')='' then raise exception 'cancel reason required'; end if;
  perform set_config('app.status_rpc','1',true);
  update orders set status=p_new where id=p_order;
  insert into order_status_history(order_id,from_status,to_status,actor_id,reason) values(p_order,cur,p_new,auth.uid(),p_reason);
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values(auth.uid(),'status_change','order',p_order,jsonb_build_object('from',cur,'to',p_new));
end $$;

create function assign_master(p_order uuid, p_master uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'access denied'; end if;
  if not exists(select 1 from profiles where id=p_master and role='master' and not is_blocked) then raise exception 'not a master'; end if;
  update order_assignments set ended_at=now() where order_id=p_order and ended_at is null;
  insert into order_assignments(order_id,master_id,assigned_by) values(p_order,p_master,auth.uid());
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values(auth.uid(),'assign_master','order',p_order,jsonb_build_object('master',p_master));
end $$;

create function decide_estimate(p_id uuid, p_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare e order_estimates;
begin
  select * into e from order_estimates where id=p_id for update;
  if e.id is null or not owns_order(e.order_id) or e.status<>'awaiting_approval' then raise exception 'access denied'; end if;
  if p_approve then
    update order_estimates set status='approved', approved_at=now(),
      snapshot=(select jsonb_agg(to_jsonb(i)) from estimate_items i where estimate_id=p_id) where id=p_id;
  else update order_estimates set status='rejected' where id=p_id; end if;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values(auth.uid(),'decide_estimate','estimate',p_id,jsonb_build_object('approve',p_approve));
end $$;

create function decide_extra_work(p_id uuid, p_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare x extra_work_proposals;
begin
  select * into x from extra_work_proposals where id=p_id for update;
  if x.id is null or not owns_order(x.order_id) or x.status<>'pending' then raise exception 'access denied'; end if;
  update extra_work_proposals set status=case when p_approve then 'approved' else 'rejected' end, decided_by=auth.uid(), decided_at=now() where id=p_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values(auth.uid(),'decide_extra_work','extra_work',p_id,jsonb_build_object('approve',p_approve));
end $$;

-- ===== RLS =====
alter table profiles enable row level security; alter table service_categories enable row level security; alter table services enable row level security;
alter table orders enable row level security; alter table order_assignments enable row level security; alter table order_status_history enable row level security;
alter table order_estimates enable row level security; alter table estimate_items enable row level security; alter table extra_work_proposals enable row level security;
alter table order_attachments enable row level security; alter table reviews enable row level security; alter table consents enable row level security;
alter table audit_logs enable row level security; alter table manager_notes enable row level security;

create policy profiles_self on profiles for select using (id=auth.uid() or is_staff());
create policy profiles_master_for_client on profiles for select using (exists(select 1 from order_assignments a join orders o on o.id=a.order_id where a.master_id=profiles.id and a.ended_at is null and o.client_id=auth.uid()));
create policy profiles_update_self on profiles for update using (id=auth.uid() or is_admin()) with check (id=auth.uid() or is_admin());

create policy cat_read on service_categories for select using (is_published or is_staff());
create policy cat_write on service_categories for all using (is_staff()) with check (is_staff());
create policy svc_read on services for select using ((is_published and not is_archived) or is_staff());
create policy svc_write on services for all using (is_staff()) with check (is_staff());

create policy orders_read on orders for select using (can_see_order(id));
create policy orders_insert on orders for insert with check (client_id=auth.uid() and status='new' and app_role()='client');
create policy orders_update on orders for update using (is_staff()) with check (is_staff());

create policy asg_read on order_assignments for select using (is_staff() or master_id=auth.uid() or owns_order(order_id));
create policy hist_read on order_status_history for select using (can_see_order(order_id));

create policy est_read on order_estimates for select using (is_staff() or (owns_order(order_id) and status<>'draft'));
create policy est_write on order_estimates for all using (is_staff() and status='draft') with check (is_staff());
create policy item_read on estimate_items for select using (exists(select 1 from order_estimates e where e.id=estimate_id and (is_staff() or (owns_order(e.order_id) and e.status<>'draft'))));
create policy item_write on estimate_items for all using (is_staff() and exists(select 1 from order_estimates e where e.id=estimate_id and e.status='draft')) with check (is_staff());

create policy extra_read on extra_work_proposals for select using (can_see_order(order_id));
create policy extra_insert on extra_work_proposals for insert with check (proposed_by=auth.uid() and status='pending' and (is_assigned_master(order_id) or is_staff()));

create policy att_read on order_attachments for select using (can_see_order(order_id));
create policy att_insert on order_attachments for insert with check (uploaded_by=auth.uid() and can_see_order(order_id) and ((stage='client' and owns_order(order_id)) or (stage<>'client' and (is_staff() or is_assigned_master(order_id)))));

create policy rev_read on reviews for select using (client_id=auth.uid() or is_staff());
create policy rev_insert on reviews for insert with check (client_id=auth.uid() and status='pending' and exists(select 1 from orders o where o.id=order_id and o.client_id=auth.uid() and o.status='completed'));
create policy rev_moderate on reviews for update using (is_staff()) with check (is_staff());
create view public_reviews with (security_invoker=false) as select id, rating, body, created_at from reviews where status='approved';
grant select on public_reviews to anon, authenticated;

create policy cons_read on consents for select using (user_id=auth.uid() or is_admin());
create policy cons_insert on consents for insert with check (user_id=auth.uid());
create policy audit_read on audit_logs for select using (is_admin());
create policy notes_all on manager_notes for all using (is_staff()) with check (is_staff() and author_id=auth.uid());

-- ===== Storage: приватный бакет, путь вида {order_id}/{file} =====
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('order-photos','order-photos',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
create policy photos_read on storage.objects for select using (bucket_id='order-photos' and can_see_order(((storage.foldername(name))[1])::uuid));
create policy photos_insert on storage.objects for insert with check (bucket_id='order-photos' and can_see_order(((storage.foldername(name))[1])::uuid));
