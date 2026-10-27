-- При создании заявки автоматически пишем первую запись истории и журнал (клиент не может писать в историю напрямую).
create or replace function log_order_created() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into order_status_history(order_id, from_status, to_status, actor_id) values (new.id, null, new.status, new.client_id);
  insert into audit_logs(actor_id, action, entity, entity_id) values (new.client_id, 'order_created', 'order', new.id);
  return new;
end $$;
drop trigger if exists orders_created_log on orders;
create trigger orders_created_log after insert on orders for each row execute function log_order_created();
