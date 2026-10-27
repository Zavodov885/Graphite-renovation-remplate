import { notFound } from "next/navigation";
import { DetailNav } from "@/components/DetailNav";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { LinkButton } from "@/components/ui/Button";
import { STATUS_LABEL, type Status } from "@/lib/status";
import { rub, UNIT_LABEL } from "@/lib/format";
import { telLink, telegramLink, whatsappLink } from "@/lib/contacts";
import type { Unit } from "@/lib/pricing";
import { cancelOrder, decideEstimate, decideExtra, submitReview } from "@/app/actions/client";
const EST_RU = { draft: "черновик", awaiting_approval: "ожидает вашего решения", approved: "согласована", rejected: "отклонена", superseded: "заменена новой версией" } as const;
const XS = { pending: "ждёт вашего решения", approved: "принято", rejected: "отклонено" } as const;

type Snap = { lines: { name: string; unit: Unit; quantity: number; totalCents: number }[]; totalCents: number };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ upload?: string; err?: string }> }) {
  await requireRole(["client"]);
  const { id } = await params; const { upload, err } = await searchParams;
  const sb = await createClient();
  const { data: o } = await sb.from("orders").select("id,title,description,address,status,calc_snapshot,preferred_date,created_at").eq("id", id).maybeSingle(); // RLS: только свой заказ
  if (!o) notFound();

  const [{ data: hist }, { data: atts }, { data: asg }, { data: ests }, { data: extras }, { data: rev }] = await Promise.all([
    sb.from("order_status_history").select("to_status,created_at,reason").eq("order_id", id).order("created_at"),
    sb.from("order_attachments").select("storage_path,stage").eq("order_id", id).order("created_at"),
    sb.from("order_assignments").select("master_id").eq("order_id", id).is("ended_at", null).maybeSingle(),
    sb.from("order_estimates").select("id,version,status,total,estimate_items(id,description,unit,qty,unit_price,line_total)").eq("order_id", id).order("version", { ascending: false }).limit(1),
    sb.from("extra_work_proposals").select("id,description,qty,price,status,reason").eq("order_id", id).order("created_at"),
    sb.from("reviews").select("rating,body,status").eq("order_id", id).maybeSingle(),
  ]);
  const est = ests?.[0];
  const signed = atts?.length ? (await sb.storage.from("order-photos").createSignedUrls(atts.map((a) => a.storage_path), 300)).data ?? [] : []; // ссылки живут 5 минут
  const master = asg ? (await sb.from("profiles").select("full_name,phone,contact_telegram,contact_max,contact_whatsapp").eq("id", asg.master_id).maybeSingle()).data : null;
  const snap = o.calc_snapshot as Snap | null;
  const STAGE = { client: "от вас", before: "до работ", during: "в процессе", after: "после работ" } as const;

  return (<main className="wrap" style={{ padding: "24px 20px" }}>
    <LinkButton href="/cabinet" variant="ghost" sm>← К списку</LinkButton>
    <h2 style={{ marginTop: 14 }}>{o.title} <StatusChip status={o.status as Status} /></h2>
    <p className="muted">{o.address} · создана {new Date(o.created_at).toLocaleDateString("ru-RU")}{o.preferred_date ? ` · желаемая дата ${new Date(o.preferred_date).toLocaleDateString("ru-RU")}` : ""}</p>
    {upload === "failed" && <p className="err" role="alert">⚠ Заявка создана, но часть фото не загрузилась. Попробуйте добавить их позже.</p>}
    {err && <p className="err" role="alert">⚠ {err}</p>}
    <DetailNav items={[{ id: "sec-estimate", label: "Смета" }, { id: "sec-extra", label: "Доп. работы" }, { id: "sec-photos", label: "Фото" }, { id: "sec-history", label: "История" }]} />
    {o.description && <div className="card"><h3>Описание</h3><p style={{ whiteSpace: "pre-wrap" }}>{o.description}</p></div>}
    {snap && <div className="card"><h3>Предварительный расчёт</h3>{snap.lines.map((l, i) => <div key={i} className="muted">{l.name}: {l.quantity} {UNIT_LABEL[l.unit]} — {rub(l.totalCents)}</div>)}<b>Предварительно: {rub(snap.totalCents)}</b><p className="muted">Это не окончательная смета: она уточняется после осмотра.</p></div>}
    {master && <div className="card"><h3>Ваш мастер</h3><p>{master.full_name || "Мастер"}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {telLink(master.phone) && <a className="btn ghost sm" href={telLink(master.phone)!}>Позвонить</a>}
      {telegramLink(master.contact_telegram) && <a className="btn ghost sm" target="_blank" rel="noopener noreferrer" href={telegramLink(master.contact_telegram)!}>Telegram</a>}
      {whatsappLink(master.contact_whatsapp) && <a className="btn ghost sm" target="_blank" rel="noopener noreferrer" href={whatsappLink(master.contact_whatsapp)!}>WhatsApp</a>}
      {master.contact_max && <span className="chip">MAX: {master.contact_max}</span>}</div></div>}
    {!!signed.length && <div className="card" id="sec-photos"><h3>Фотографии</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
      {signed.map((s, i) => s.signedUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <figure key={i} style={{ margin: 0 }}><img src={s.signedUrl} alt="Фото заказа" style={{ width: "100%", borderRadius: 8, aspectRatio: "4/3", objectFit: "cover" }} /><figcaption className="muted">{STAGE[(atts?.[i]?.stage ?? "client") as keyof typeof STAGE]}</figcaption></figure>))}</div></div>}
    {est && <div className="card" id="sec-estimate"><h3>Смета v{est.version} <span className="muted">· {EST_RU[est.status as keyof typeof EST_RU]}</span></h3>
      <div className="table-wrap"><table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>{(est.estimate_items as { id: string; description: string; unit: Unit; qty: number; line_total: number }[]).map((i) => <tr key={i.id}><td>{i.description}</td><td>{i.qty} {UNIT_LABEL[i.unit]}</td><td>{rub(Number(i.line_total) * 100)}</td></tr>)}</tbody></table></div>
      <p><b>Итого: {rub(Number(est.total) * 100)}</b></p>
      {est.status === "awaiting_approval" && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <form action={decideEstimate}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="estimateId" value={est.id} /><input type="hidden" name="approve" value="1" /><button className="btn">Согласовать смету</button></form>
        <form action={decideEstimate}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="estimateId" value={est.id} /><input type="hidden" name="approve" value="0" /><button className="btn danger">Отклонить</button></form></div>}
      {est.status === "approved" && <p className="muted">Условия согласованы и зафиксированы. Изменения возможны только новой версией сметы.</p>}</div>}
    {!!extras?.length && <div className="card" id="sec-extra"><h3>Дополнительные работы</h3>{extras.map((x) => <div key={x.id} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
      <b>{x.description}</b> — {rub(Number(x.price) * Number(x.qty) * 100)} <span className="chip">{XS[x.status as keyof typeof XS]}</span><div className="muted">Причина: {x.reason}</div>
      {x.status === "pending" && <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <form action={decideExtra}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="extraId" value={x.id} /><input type="hidden" name="approve" value="1" /><button className="btn sm">Принять</button></form>
        <form action={decideExtra}><input type="hidden" name="orderId" value={o.id} /><input type="hidden" name="extraId" value={x.id} /><input type="hidden" name="approve" value="0" /><button className="btn danger sm">Отклонить</button></form></div>}</div>)}</div>}
    {o.status === "new" && <div className="card"><h3>Отмена заявки</h3><form action={cancelOrder} className="row-f"><input type="hidden" name="orderId" value={o.id} /><label className="field">Причина<input className="input" name="reason" required minLength={3} maxLength={500} /></label><button className="btn danger" style={{ marginBottom: 12 }}>Отменить заявку</button></form></div>}
    {o.status === "completed" && (rev ? <div className="card"><h3>Ваш отзыв</h3><div>{"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}</div><p>{rev.body}</p><p className="muted">{rev.status === "approved" ? "Опубликован" : rev.status === "hidden" ? "Скрыт" : "На модерации"}</p></div> :
      <div className="card"><h3>Оставить отзыв</h3><form action={submitReview}><input type="hidden" name="orderId" value={o.id} /><label className="field">Оценка<select className="input" name="rating" defaultValue="5" style={{ width: 120 }}>{[5, 4, 3, 2, 1].map((n) => <option key={n}>{n}</option>)}</select></label><label className="field">Текст<textarea className="input" name="body" rows={3} required minLength={3} maxLength={3000} /></label><button className="btn">Отправить</button></form></div>)}
    <div className="card" id="sec-history"><h3>История</h3><ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>{hist?.map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleString("ru-RU")} — {STATUS_LABEL[h.to_status as Status]}{h.reason ? `: ${h.reason}` : ""}</li>)}</ul></div>
  </main>);
}
