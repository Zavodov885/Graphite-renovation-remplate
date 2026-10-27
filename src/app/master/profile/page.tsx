import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "@/app/actions/master";
export const metadata = { title: "Мой профиль" };

export default async function Profile({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const p = await requireRole(["master"]); const { err } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("profiles").select("full_name,phone,contact_telegram,contact_whatsapp,contact_max").eq("id", p.id).single();
  return (<><h2>Мой профиль</h2><p className="muted">Эти контакты увидит клиент после назначения вас на его заказ.</p>
    <form action={saveProfile} className="card" style={{ maxWidth: 480 }}>{err && <p className="err" role="alert">⚠ {err}</p>}
      <label className="field">Имя<input className="input" name="full_name" defaultValue={data?.full_name ?? ""} required minLength={2} /></label>
      <label className="field">Телефон<input className="input" name="phone" type="tel" defaultValue={data?.phone ?? ""} /></label>
      <label className="field">Telegram (без @)<input className="input" name="contact_telegram" defaultValue={data?.contact_telegram ?? ""} /></label>
      <label className="field">WhatsApp (номер)<input className="input" name="contact_whatsapp" defaultValue={data?.contact_whatsapp ?? ""} /></label>
      <label className="field">MAX (ник или номер)<input className="input" name="contact_max" defaultValue={data?.contact_max ?? ""} /></label>
      <button className="btn">Сохранить</button></form></>);
}
