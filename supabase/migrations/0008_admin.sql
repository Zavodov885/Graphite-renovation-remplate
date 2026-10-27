-- Часть 4c: администратор. Роли, блокировка, каталог, настройки компании (всё через RPC с журналом).
alter table profiles add column if not exists email text;
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email);
  if coalesce(new.raw_user_meta_data->>'consent_version','') <> '' then
    insert into consents(user_id, doc_type, doc_version) values (new.id, 'personal_data', new.raw_user_meta_data->>'consent_version');
  end if;
  return new;
end $$;

-- email в профиле меняет только администратор
create or replace function profiles_guard() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not is_admin() and (new.role<>old.role or new.is_blocked<>old.is_blocked or new.id<>old.id or new.email is distinct from old.email) then
    raise exception 'privileged fields are admin-only'; end if;
  new.updated_at=now(); return new; end $$;

create table if not exists company_settings (
  id int primary key default 1 check (id=1), name text, phone text, email text, address text, work_hours text, updated_at timestamptz not null default now());
insert into company_settings(id) values (1) on conflict do nothing;
alter table company_settings enable row level security;
drop policy if exists company_read on company_settings;
create policy company_read on company_settings for select using (true);  -- контакты публичны

create or replace function set_user_role(p_user uuid, p_role user_role) returns void language plpgsql security definer set search_path=public as $$
declare old user_role;
begin
  if not is_admin() then raise exception 'access denied'; end if;
  if p_user=auth.uid() then raise exception 'нельзя менять собственную роль'; end if;
  select role into old from profiles where id=p_user;
  if old is null then raise exception 'пользователь не найден'; end if;
  update profiles set role=p_role where id=p_user;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'role_changed','user',p_user,jsonb_build_object('from',old,'to',p_role));
end $$;

create or replace function set_user_blocked(p_user uuid, p_blocked boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'access denied'; end if;
  if p_user=auth.uid() then raise exception 'нельзя блокировать себя'; end if;
  update profiles set is_blocked=p_blocked where id=p_user;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'user_blocked','user',p_user,jsonb_build_object('blocked',p_blocked));
end $$;

create or replace function update_company_settings(p_name text, p_phone text, p_email text, p_address text, p_hours text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'access denied'; end if;
  update company_settings set name=nullif(p_name,''), phone=nullif(p_phone,''), email=nullif(p_email,''), address=nullif(p_address,''), work_hours=nullif(p_hours,''), updated_at=now() where id=1;
  insert into audit_logs(actor_id,action,entity) values (auth.uid(),'company_updated','settings');
end $$;

create or replace function create_category(p_name text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'access denied'; end if;
  insert into service_categories(name,slug,sort) values (p_name,'cat-'||substr(gen_random_uuid()::text,1,8),(select coalesce(max(sort),0)+1 from service_categories));
  insert into audit_logs(actor_id,action,entity,meta) values (auth.uid(),'category_created','category',jsonb_build_object('name',p_name));
end $$;

create or replace function create_service(p_category uuid, p_name text, p_unit text, p_price numeric, p_note text, p_published boolean) returns void language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin
  if not is_admin() then raise exception 'access denied'; end if;
  if p_unit not in ('m2','m','pcs','fixed') or p_price<0 then raise exception 'некорректные данные'; end if;
  insert into services(category_id,name,slug,unit,base_price,price_note,is_published) values (p_category,p_name,'svc-'||substr(gen_random_uuid()::text,1,8),p_unit,round(p_price,2),nullif(p_note,''),p_published) returning id into new_id;
  insert into audit_logs(actor_id,action,entity,entity_id) values (auth.uid(),'service_created','service',new_id);
end $$;

create or replace function set_service_archived(p_id uuid, p_archived boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'access denied'; end if;
  update services set is_archived=p_archived, is_published=case when p_archived then false else is_published end where id=p_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'service_archived','service',p_id,jsonb_build_object('archived',p_archived));
end $$;
