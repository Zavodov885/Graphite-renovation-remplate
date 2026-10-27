-- Часть 4a: дата визита, версии смет, отправка сметы, модерация отзывов, правка прайса (всё с журналом).
alter table orders add column if not exists visit_on date;

create or replace function new_estimate_version(p_order uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v int; new_id uuid;
begin
  if not is_staff() then raise exception 'access denied'; end if;
  if exists(select 1 from order_estimates where order_id=p_order and status='draft') then raise exception 'черновик сметы уже есть'; end if;
  select coalesce(max(version),0)+1 into v from order_estimates where order_id=p_order;
  update order_estimates set status='superseded' where order_id=p_order and status in ('awaiting_approval','rejected','approved');
  insert into order_estimates(order_id,version,created_by) values (p_order,v,auth.uid()) returning id into new_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'estimate_version_created','estimate',new_id,jsonb_build_object('order',p_order,'version',v));
  return new_id;
end $$;

create or replace function send_estimate(p_estimate uuid) returns void language plpgsql security definer set search_path=public as $$
declare e order_estimates; cnt int; cur order_status;
begin
  if not is_staff() then raise exception 'access denied'; end if;
  select * into e from order_estimates where id=p_estimate for update;
  if e.id is null or e.status<>'draft' then raise exception 'это не черновик сметы'; end if;
  select count(*) into cnt from estimate_items where estimate_id=p_estimate;
  if cnt=0 then raise exception 'добавьте хотя бы одну позицию'; end if;
  -- итог считается на сервере из позиций
  update order_estimates set total=(select coalesce(sum(line_total),0) from estimate_items where estimate_id=p_estimate), status='awaiting_approval' where id=p_estimate;
  select status into cur from orders where id=e.order_id for update;
  if cur='under_review' then
    perform set_config('app.status_rpc','1',true);
    update orders set status='awaiting_approval' where id=e.order_id;
    insert into order_status_history(order_id,from_status,to_status,actor_id,reason) values (e.order_id,cur,'awaiting_approval',auth.uid(),'смета отправлена клиенту');
  end if;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'estimate_sent','estimate',p_estimate,jsonb_build_object('order',e.order_id));
end $$;

create or replace function moderate_review(p_id uuid, p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'access denied'; end if;
  if p_status not in ('approved','hidden') then raise exception 'bad status'; end if;
  update reviews set status=p_status where id=p_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'review_moderated','review',p_id,jsonb_build_object('status',p_status));
end $$;

create or replace function update_service(p_id uuid, p_price numeric, p_published boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'access denied'; end if;
  if p_price<0 then raise exception 'цена не может быть отрицательной'; end if;
  update services set base_price=round(p_price,2), is_published=p_published where id=p_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'service_updated','service',p_id,jsonb_build_object('price',p_price,'published',p_published));
end $$;
