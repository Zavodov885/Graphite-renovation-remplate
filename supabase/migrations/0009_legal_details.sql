-- Реквизиты оператора персональных данных (для политики и согласия).
alter table company_settings add column if not exists legal_details text;
drop function if exists update_company_settings(text, text, text, text, text);
create or replace function update_company_settings(p_name text, p_phone text, p_email text, p_address text, p_hours text, p_legal text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'access denied'; end if;
  update company_settings set name=nullif(p_name,''), phone=nullif(p_phone,''), email=nullif(p_email,''), address=nullif(p_address,''), work_hours=nullif(p_hours,''), legal_details=nullif(p_legal,''), updated_at=now() where id=1;
  insert into audit_logs(actor_id,action,entity) values (auth.uid(),'company_updated','settings');
end $$;
