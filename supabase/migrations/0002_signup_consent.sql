-- Регистрация: профиль всегда с ролью client (по умолчанию) + запись согласия с версией документа.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  if coalesce(new.raw_user_meta_data->>'consent_version','') <> '' then
    insert into consents(user_id, doc_type, doc_version) values (new.id, 'personal_data', new.raw_user_meta_data->>'consent_version');
  end if;
  return new;
end $$;
