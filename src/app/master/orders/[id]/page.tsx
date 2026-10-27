import { notFound } from "next/navigation";
import { DetailNav } from "@/components/DetailNav";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { LinkButton } from "@/components/ui/Button";
import { MasterPhotos } from "@/components/MasterPhotos";
import { STATUS_LABEL, type Status } from "@/lib/status";
import { rub } from "@/lib/format";
import { proposeExtra, startWork } from "@/app/actions/master";
const STAGE = { client: "клиент", before: "до работ", during: "в процессе", after: "после работ" } as const;
const XS = { pending: "ждёт клиента", approved: "принято", rejected: "отклонено" } as const;

export default async function MasterOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string }> }) {
  const { id } = await params; const { err } = await searchParams;
  const sb = await createClient();
  const { data: o } = await sb.from("orders").select("id,title,description,address,status,contact_name,contact_phone,visit_on").eq("id", id).maybeSingle(); // RLS: только назначенный мне
  if (!o) notFound();
  const [{ data: atts }, { data: extras }, { data: hist }] = await Promise.all([
    sb.from("order_attachments").select("storage_path,stage").eq("order_id", id).order("created_at"),
    sb.from("extra_work_proposals").select("description,qty,price,status,reason").eq("order_id", id).order("created_at"),
    sb.from("order_status_history").select("to_status,created_at,reason").eq("order_id", id).order("created_at"),
  ]);
  const signed = atts?.length ? (await sb.storage.from("order-photos").createSignedUrls(atts.map((a) => a.storage_path), 300)).data ?? [] : [];
  return (<>
    <LinkButton href="/master" variant="ghost" sm>← К заданиям</LinkButton>
    <h2 style={{ marginTop: 14 }}>{o.title} <StatusChip status={o.status as Status} /></h2>
    <p className="muted">{o.address} · клиент: {o.contact_name}, {o.contact_phone}{o.visit_on ? ` · визит ${new Date(o.visit_on).toLocaleDateString("ru-RU")}` : ""}</p>
    {err && <p className="err" role="alert">⚠ {err}</p>}
    <DetailNav items={[{ id: "sec-task", label: "Задание" }, { id: "sec-photos", label: "Фотоотчёт" }, { id: "sec-extra", label: "Доп. работы" }, { id: "sec-history", label: "История" }]} />
    {o.description && <div className="card" id="sec-task"><h3>Задание</h3><p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{o.description}</p></div>}
    {o.status === "master_assigned" && <div className="card"><h3>Начать работу</h3><form action={startWork}><input type="hidden" name="orderId" value={o.id} /><button className="btn">Начать работу</button></form></div>}
    {o.status === "awaiting_extra_work_approval" && <p className="muted">Ждём решения клиента по дополнительным работам.</p>}
    {["master_assigned", "in_progress", "awaiting_extra_work_approval"].includes(o.status) && <div className="card" id="sec-photos"><h3>Фотоотчёт</h3><MasterPhotos orderId={o.id} /></div>}
    {!!signed.length && <div className="card"><h3>Фото заказа</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
      {signed.map((s, i) => s.signedUrl && (/* eslint-disable-next-line @next/next/no-img-element */ <figure key={i} style={{ margin: 0 }}><img src={s.signedUrl} alt="Фото заказа" style={{ width: "100%", borderRadius: 8, aspectRatio: "4/3", objectFit: "cover" }} /><figcaption className="muted">{STAGE[(atts?.[i]?.stage ?? "client") as keyof typeof STAGE]}</figcaption></figure>))}</div></div>}
    <div className="card" id="sec-extra"><h3>Дополнительные работы</h3>
      {extras?.map((x, i) => <p key={i} className="muted">{x.description} — {rub(Number(x.price) * Number(x.qty) * 100)} · {XS[x.status as keyof typeof XS]}<br />Причина: {x.reason}</p>)}
      {o.status === "in_progress" ? <form action={proposeExtra}><input type="hidden" name="orderId" value={o.id} />
        <label className="field">Описание<input className="input" name="description" required minLength={3} maxLength={300} /></label>
        <div className="row-f"><label className="field">Кол-во<input className="input" name="qty" type="number" min="0.001" step="any" required style={{ width: 100 }} /></label><label className="field">Стоимость за ед., ₽<input className="input" name="price" type="number" min="0" step="any" required style={{ width: 140 }} /></label></div>
        <label className="field">Причина<input className="input" name="reason" required minLength={3} maxLength={500} /></label><button className="btn ghost">Предложить клиенту</button></form> : <p className="muted">Предложить доп. работы можно, когда заказ «В работе».</p>}</div>
    <div className="card" id="sec-history"><h3>История</h3><ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>{hist?.map((h, i) => <li key={i}>{new Date(h.created_at).toLocaleString("ru-RU")} — {STATUS_LABEL[h.to_status as Status]}{h.reason ? `: ${h.reason}` : ""}</li>)}</ul></div></>);
}
