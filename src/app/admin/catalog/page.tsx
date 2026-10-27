import { createClient } from "@/lib/supabase/server";
import { addCategory, addService, archiveService } from "@/app/actions/admin";
import { UNIT_LABEL } from "@/lib/format";
import type { Unit } from "@/lib/pricing";
export const metadata = { title: "Каталог" };

export default async function Catalog({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const sb = await createClient();
  const [{ data: cats }, { data: svcs }] = await Promise.all([
    sb.from("service_categories").select("id,name").order("sort"),
    sb.from("services").select("id,name,unit,base_price,is_published,is_archived,service_categories(name)").order("name"),
  ]);
  return (<><h2>Каталог услуг</h2><p className="muted">Цены и публикацию существующих услуг меняет менеджер в разделе «Прайс-лист».</p>{err && <p className="err" role="alert">⚠ {err}</p>}
    <div className="grid2"><form action={addCategory} className="card"><h3>Новая категория</h3><label className="field">Название<input className="input" name="name" required minLength={2} maxLength={100} /></label><button className="btn">Добавить</button></form>
      <form action={addService} className="card"><h3>Новая услуга</h3>
        <label className="field">Категория<select className="input" name="categoryId" required>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field">Название<input className="input" name="name" required minLength={2} maxLength={200} /></label>
        <div className="row-f"><label className="field">Ед.<select className="input" name="unit">{(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></label><label className="field">Цена, ₽<input className="input" name="price" type="number" min="0" step="0.01" required style={{ width: 120 }} /></label></div>
        <label className="field">Условия цены (например, материал не входит)<input className="input" name="note" maxLength={300} /></label>
        <label style={{ display: "flex", gap: 8, marginBottom: 12 }}><input type="checkbox" name="published" style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />Сразу показывать на сайте</label><button className="btn">Добавить услугу</button></form></div>
    <div className="card table-wrap"><table><thead><tr><th>Услуга</th><th>Категория</th><th>Цена</th><th>Состояние</th><th /></tr></thead><tbody>
      {svcs?.map((s) => { const c = Array.isArray(s.service_categories) ? s.service_categories[0] : s.service_categories; return (<tr key={s.id}><td>{s.name}</td><td>{c?.name}</td><td>{Number(s.base_price).toLocaleString("ru-RU")} ₽ / {UNIT_LABEL[s.unit as Unit]}</td>
        <td>{s.is_archived ? "Архив" : s.is_published ? "Опубликована" : "Скрыта"}</td>
        <td><form action={archiveService}><input type="hidden" name="serviceId" value={s.id} /><input type="hidden" name="archived" value={s.is_archived ? "0" : "1"} /><button className="btn ghost sm">{s.is_archived ? "Вернуть" : "В архив"}</button></form></td></tr>); })}</tbody></table></div></>);
}
