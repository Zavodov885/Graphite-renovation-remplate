import { notFound } from "next/navigation";
import { DetailNav } from "@/components/DetailNav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { LinkButton } from "@/components/ui/Button";
import { STATUS_LABEL, canTransition, type Status } from "@/lib/status";
import { rub, UNIT_LABEL } from "@/lib/format";
import type { Unit } from "@/lib/pricing";
import { addItem, addNote, assignMaster, changeStatus, newEstimate, removeItem, sendEstimate, setVisit } from "@/app/actions/manager";

const EST = { draft: "черновик", awaiting_approval: "ожидает согласования", approved: "согласована", rejected: "отклонена", superseded: "заменена новой версией" } as const;
const STAGE = { client: "клиент", before: "до работ", during: "в процессе", after: "после работ" } as const;
type Item = { id: string; description: string; unit: Unit; qty: number; unit_price: number; line_total: number };

export default async function ManagerOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const p = await requireRole(["manager", "admin"]);
  const { id } = await params; const { err } = await searchParams;
  const sb = await createClient();
  const { data: o } = await sb.from("orders").select("id,title,description,address,status,contact_name,contact_phone,calc_snapshot,visit_on,preferred_date,created_at").eq("id", id).maybeSingle();
  if (!o) notFound();
  const [{ data: hist }, { data: atts }, { data: asg }, { data: masters }, { data: ests }, { data: notes }, { data: extras }] = await Promise.all([
    sb.from("order_status_history").select("to_status,created_at,reason").eq("order_id", id).order("created_at"),
    sb.from("order_attachments").select("storage_path,stage").eq("order_id", id).order("created_at"),
    sb.from("order_assignments").select("master_id").eq("order_id", id).is("ended_at", null).maybeSingle(),
    sb.from("profiles").select("id,full_name").eq("role", "master").eq("is_blocked", false),
    sb.from("order_estimates").select("id,version,status,total,estimate_items(id,description,unit,qty,unit_price,line_total)").eq("order_id", id).order("version", { ascending: false }),
    sb.from("manager_notes").select("body,created_at").eq("order_id", id).order("created_at", { ascending: false }),
    sb.from("extra_work_proposals").select("description,qty,price,status,reason").eq("order_id", id).order("created_at"),
  ]);
  const signed = atts?.length ? (await sb.storage.from("order-photos").createSignedUrls(atts.map((a) => a.storage_path), 300)).data ?? [] : [];
  const curMaster = masters?.find((m) => m.id === asg?.master_id);
  const options = (Object.keys(STATUS_LABEL) as Status[]).filter((s) => s !== "master_assigned" && canTransition(o.status as Status, s, p.role));
  const est = ests?.[0]; const items = (est?.estimate_items ?? []) as Item[];
  const sum = items.reduce((s, i) => s + Math.round(Number(i.qty) * Number(i.unit_price) * 100) / 100, 0);
  const snap = o.calc_snapshot as { lines: { name: string; unit: Unit; quantity: number; totalCents: number }[]; totalCents: number } | null;

  return (<>
    <LinkButton href="/manager/orders" variant="ghost" sm>← К списку</LinkButton>
    <h2 style={{ marginTop: 14 }}>{o.title} <StatusChip status={o.status as Status} /></h2>
    <p className="muted">{o.contact_name} · {o.contact_phone} · {o.address}{o.preferred_date ? ` · желаемая дата ${new Date(o.preferred_date).toLocaleDateString("ru-RU")}` : ""}</p>
    {err && <p className="err" role="alert">⚠ {err}</p>}
    <DetailNav items={[{ id: "sec-status", label: "Статус" }, { id: "sec-master", label: "Мастер" }, { id: "sec-notes", label: "Заметки" }, { id: "sec-estimate", label: "Смета" }, { id: "sec-photos", label: "Фото" }, { id: "sec-history", label: "История" }]} />
    {o.description && <div className="card"><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{o.description}</p></div>}
    {snap && <div className="card"><h3>Расчёт клиента (предварительный)</h3>{snap.lines.map((l, i) => <div key={i} className="muted">{l.name}: {l.quantity} {UNIT_LABEL[l.unit]} — {rub(l.totalCents)}</div>)}<b>{rub(snap.totalCents)}</b></div>}
    <div className="grid2"><div>
      <div className="card" id="sec-status"><h3>Статус</h3>{options.length ? <form action={changeStatus} className="row-f"><input type="hidden" name="orderId" value={o.id} />
        <label className="field">Новый статус<select className="input" name="to">{options.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
        <label className="field">Причина (для отмены обязательна)<input className="input" name="reason" maxLength={500} /></label><button className="btn" style={{ marginBottom: 12 }}>Изменить</button></form> : <p className="muted">Для этого статуса переходов нет.</p>}</div>
      <div className="card" id="sec-master"><h3>Мастер</h3><p>{curMaster?.full_name ?? (asg ? "Назначен" : "Не назначен")}</p>
        <form action={assignMaster} className="row-f"><input type="hidden" name="orderId" value={o.id} /><label className="field">{asg ? "Заменить на" : "Назначить"}<select className="input" name="masterId" required>{masters?.map((m) => <option key={m.id} value={m.id}>{m.full_name || "Без имени"}</option>)}</select></label><button className="btn" style={{ marginBottom: 12 }} disabled={!masters?.length}>{asg ? "Заменить" : "Назначить"}</button></form>
        {!masters?.length && <p className="muted">Мастеров нет: назначьте роль «Мастер» пользователю в базе.</p>}</div>
      <div className="card"><h3>Визит</h3><p className="muted">{o.visit_on ? `Назначен на ${new Date(o.visit_on).toLocaleDateString("ru-RU")}` : "Дата не назначена"}</p>
        <form action={setVisit} className="row-f"><input type="hidden" name="orderId" value={o.id} /><input className="input" type="date" name="visitOn" required /><button className="btn ghost sm" style={{ marginBottom: 12 }}>Сохранить</button></form></div>
      <div className="card" id="sec-notes"><h3>Внутренние заметки <span className="muted">(клиент не видит)</span></h3>{notes?.map((n, i) => <p key={i} className="muted">• {n.body}</p>)}
        <form action={addNote}><input type="hidden" name="orderId" value={o.id} /><textarea className="input" name="body" rows={2} required maxLength={2000} /><button className="btn ghost sm" style={{ marginTop: 8 }}>Добавить</button></form></div>
    </div><div>
      <div className="card" id="sec-estimate"><h3>Смета {est && <span className="muted">v{est.version} · {EST[est.status as keyof typeof EST]}</span>}</h3>
        {!est ? <form action={newEstimate}><input type="hidden" name="orderId" value={o.id} /><button className="btn">Создать смету</button></form> : <>
          {items.length ? <div className="table-wrap"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th /></tr></thead><tbody>
            {items.map((i) => <tr key={i.id}><td>{i.description}</td><td>{i.qty} {UNIT_LABEL[i.unit]}</td><td>{rub(Number(i.unit_price) * 100)}</td><td>{rub(Number(i.line_total) * 100)}</td>
              <td>{est.status === "draft" && <form action={removeItem}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="itemId" value={i.id} /><button className="btn danger sm" aria-label="Удалить позицию">×</button></form>}</td></tr>)}</tbody></table></div> : <p className="muted">Позиций пока нет.</p>}
          <p><b>Итого: {rub(est.status === "draft" ? sum * 100 : Number(est.total) * 100)}</b></p>
          {est.status === "draft" ? <>
            <form action={addItem}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="estimateId" value={est.id} />
              <label className="field">Позиция<input className="input" name="description" required minLength={2} maxLength={300} /></label>
              <div className="row-f"><label className="field">Ед.<select className="input" name="unit">{(Object.keys(UNIT_LABEL) as Unit[]).map((u) => <option key={u} value={u}>{UNIT_LABEL[u]}</option>)}</select></label>
                <label className="field">Кол-во<input className="input" name="qty" type="number" min="0" step="any" required style={{ width: 100 }} /></label>
                <label className="field">Цена, ₽<input className="input" name="unitPrice" type="number" min="0" step="any" required style={{ width: 120 }} /></label></div>
              <button className="btn ghost sm">Добавить позицию</button></form>
            <form action={sendEstimate} style={{ marginTop: 10 }}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="estimateId" value={est.id} /><button className="btn" disabled={!items.length}>Отправить клиенту на согласование</button></form></> :
            <form action={newEstimate}><input type="hidden" name="orderId" value={o.id} /><button className="btn ghost sm">Создать новую версию</button></form>}</>}</div>
      {!!extras?.length && <div className="card"><h3>Дополнительные работы</h3>{extras.map((x, i) => <p key={i} className="muted">{x.description} — {rub(Number(x.price) * Number(x.qty) * 100)} · {x.status === "pending" ? "ждёт клиента" : x.status === "approved" ? "принято" : "отклонено"}</p>)}</div>}
      {!!signed.length && <div className="card" id="sec-photos"><h3>Фото</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
        {signed.map((s, i) => s.signedUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <figure key={i} style={{ margin: 0 }}><img src={s.signedUrl} alt="Фото заказа" style={{ width: "100%", borderRadius: 8, aspectRatio: "4/3", objectFit: "cover" }} /><figcaption className="muted">{STAGE[(atts?.[i]?.stage ?? "client") as keyof typeof STAGE]}</figcaption></figure>))}</div></div>}
      <div className="card" id="sec-history"><h3>История</h3><ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>{hist?.map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleString("ru-RU")} — {STATUS_LABEL[h.to_status as Status]}{h.reason ? `: ${h.reason}` : ""}</li>)}</ul></div>
    </div></div></>);
}
