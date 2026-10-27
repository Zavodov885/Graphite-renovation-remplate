import { createClient } from "@/lib/supabase/server";
import { saveCompany } from "@/app/actions/admin";
export const metadata = { title: "Настройки компании" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const sb = await createClient();
  const { data: c } = await sb.from("company_settings").select("name,phone,email,address,work_hours,legal_details").eq("id", 1).maybeSingle();
  return (<><h2>Настройки компании</h2><p className="muted">Эти контакты показываются на главной. Пустые поля не отображаются.</p>
    <form action={saveCompany} className="card" style={{ maxWidth: 520 }}>{err && <p className="err" role="alert">⚠ {err}</p>}
      <label className="field">Название компании<input className="input" name="name" defaultValue={c?.name ?? ""} maxLength={100} /></label>
      <label className="field">Телефон<input className="input" name="phone" type="tel" defaultValue={c?.phone ?? ""} maxLength={30} /></label>
      <label className="field">Email<input className="input" name="email" type="email" defaultValue={c?.email ?? ""} maxLength={100} /></label>
      <label className="field">Адрес<input className="input" name="address" defaultValue={c?.address ?? ""} maxLength={200} /></label>
      <label className="field">Часы работы<input className="input" name="hours" defaultValue={c?.work_hours ?? ""} maxLength={100} /></label>
      <label className="field">Реквизиты оператора персональных данных (полное наименование, ИНН, ОГРН) — для политики и согласия<textarea className="input" name="legal" rows={3} defaultValue={c?.legal_details ?? ""} maxLength={500} /></label>
      <button className="btn">Сохранить</button></form></>);
}
