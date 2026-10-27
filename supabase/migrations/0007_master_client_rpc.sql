-- Часть 4b: предложение доп. работ мастером и возврат заказа «в работу» после решения клиента.
create or replace function propose_extra_work(p_order uuid, p_desc text, p_qty numeric, p_price numeric, p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare cur order_status;
begin
  if not (is_assigned_master(p_order) or is_staff()) then raise exception 'access denied'; end if;
  if p_qty<=0 or p_price<0 then raise exception 'некорректное количество или цена'; end if;
  select status into cur from orders where id=p_order for update;
  if cur<>'in_progress' then raise exception 'доп. работы можно предложить только по заказу в работе'; end if;
  insert into extra_work_proposals(order_id,proposed_by,description,qty,price,reason) values (p_order,auth.uid(),p_desc,p_qty,p_price,p_reason);
  perform set_config('app.status_rpc','1',true);
  update orders set status='awaiting_extra_work_approval' where id=p_order;
  insert into order_status_history(order_id,from_status,to_status,actor_id,reason) values (p_order,cur,'awaiting_extra_work_approval',auth.uid(),'предложены дополнительные работы');
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'extra_work_proposed','order',p_order,jsonb_build_object('price',p_price,'qty',p_qty));
end $$;

create or replace function decide_extra_work(p_id uuid, p_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare x extra_work_proposals; cur order_status;
begin
  select * into x from extra_work_proposals where id=p_id for update;
  if x.id is null or not owns_order(x.order_id) or x.status<>'pending' then raise exception 'access denied'; end if;
  update extra_work_proposals set status=case when p_approve then 'approved' else 'rejected' end, decided_by=auth.uid(), decided_at=now() where id=p_id;
  insert into audit_logs(actor_id,action,entity,entity_id,meta) values (auth.uid(),'decide_extra_work','extra_work',p_id,jsonb_build_object('approve',p_approve));
  if not exists(select 1 from extra_work_proposals where order_id=x.order_id and status='pending') then
    select status into cur from orders where id=x.order_id for update;
    if cur='awaiting_extra_work_approval' then
      perform set_config('app.status_rpc','1',true);
      update orders set status='in_progress' where id=x.order_id;
      insert into order_status_history(order_id,from_status,to_status,actor_id,reason) values (x.order_id,cur,'in_progress',auth.uid(),'клиент принял решение по доп. работам');
    end if;
  end if;
end $$;
