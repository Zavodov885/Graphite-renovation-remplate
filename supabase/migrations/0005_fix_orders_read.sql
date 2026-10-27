-- Исправление: INSERT ... RETURNING для заказов падал, потому что политика чтения вызывала функцию,
-- которая не видит строку, вставляемую в этой же команде. Владельца проверяем прямо по колонке client_id.
drop policy if exists orders_read on orders;
create policy orders_read on orders for select using (
  (client_id = auth.uid() and app_role() is not null) or is_staff() or is_assigned_master(id)
);
