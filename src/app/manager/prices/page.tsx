import { createClient } from "@/lib/supabase/server";
import { updateService } from "@/app/actions/manager";
import { UNIT_LABEL } from "@/lib/format";
import type { Unit } from "@/lib/pricing";
export const metadata = { title: "Прайс-лист" };

export default async function Prices({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("services").select("id,name,unit,base_price,is_published").order("name");
  return (<><h2>Прайс-лист</h2><p className="muted">Изменения сразу попадают в публичный прайс и калькулятор.</p>{err && <p className="err" role="alert">⚠ {err}</p>}
    <div className="card table-wrap"><table><thead><tr><th>Услуга</th><th>Ед.</th><th>Цена, ₽</th><th>Опубликована</th><th /></tr></thead><tbody>
      {data?.map((s) => (<tr key={s.id}><td>{s.name}</td><td>{UNIT_LABEL[s.unit as Unit]}</td>
        <td colSpan={3}><form action={updateService} className="row-f" style={{ alignItems: "center" }}><input type="hidden" name="id" value={s.id} />
          <input className="input" name="price" type="number" min="0" step="0.01" defaultValue={Number(s.base_price)} style={{ width: 120 }} aria-label={`Цена: ${s.name}`} />
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" name="published" defaultChecked={s.is_published} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />показывать</label>
          <button className="btn ghost sm">Сохранить</button></form></td></tr>))}</tbody></table></div></>);
}
