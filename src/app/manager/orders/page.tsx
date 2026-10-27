import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CollapsibleFilters } from "@/components/CollapsibleFilters";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { STATUS_LABEL, type Status } from "@/lib/status";
export const metadata = { title: "Заявки" };
const PAGE = 20;
type SP = { q?: string; status?: string; sort?: string; page?: string; from?: string; to?: string };

export default async function Orders({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams; const page = Math.max(1, Number(sp.page) || 1);
  const sb = await createClient();
  let qb = sb.from("orders").select("id,title,address,status,created_at,contact_name", { count: "exact" });
  if (sp.status && sp.status in STATUS_LABEL) qb = qb.eq("status", sp.status);
  const q = (sp.q ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
  if (q) qb = qb.or(`title.ilike.%${q}%,address.ilike.%${q}%,contact_name.ilike.%${q}%`);
  if (sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from)) qb = qb.gte("created_at", sp.from);
  if (sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to)) qb = qb.lte("created_at", `${sp.to}T23:59:59`);
  const { data, count, error } = await qb.order("created_at", { ascending: sp.sort === "asc" }).range((page - 1) * PAGE, page * PAGE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const link = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]); u.set("page", String(p)); return `/manager/orders?${u}`; };
  const quick: [string, string][] = [["", "Все"], ["new", "Новые"], ["under_review", "На рассмотрении"], ["in_progress", "В работе"], ["completed", "Завершены"]];
  const activeFilters = [sp.q, sp.status, sp.from, sp.to].filter(Boolean).length;
  return (<><h2>Заявки</h2>
    <div className="quick">{quick.map(([v, l]) => <Link key={v} href={v ? `/manager/orders?status=${v}` : "/manager/orders"} className={`btn sm ${(sp.status ?? "") === v ? "" : "ghost"}`}>{l}</Link>)}</div>
    <CollapsibleFilters active={activeFilters}><form className="row-f card" method="get">
      <label className="field">Поиск<input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="название, адрес, клиент" /></label>
      <label className="field">Статус<select className="input" name="status" defaultValue={sp.status ?? ""}><option value="">Все</option>{(Object.keys(STATUS_LABEL) as Status[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
      <label className="field">С<input className="input" type="date" name="from" defaultValue={sp.from ?? ""} /></label>
      <label className="field">По<input className="input" type="date" name="to" defaultValue={sp.to ?? ""} /></label>
      <label className="field">Сортировка<select className="input" name="sort" defaultValue={sp.sort ?? "desc"}><option value="desc">Сначала новые</option><option value="asc">Сначала старые</option></select></label>
      <button className="btn" style={{ marginBottom: 12 }}>Применить</button></form></CollapsibleFilters>
    {error ? <ErrorState message="Не удалось загрузить заявки." /> : !data?.length ? <EmptyState title="Заявок не найдено" hint="Измените фильтры или поиск." /> :
      <div className="card table-wrap"><table><thead><tr><th>Работы</th><th>Дата</th><th>Клиент</th><th>Адрес</th><th>Статус</th></tr></thead><tbody>
        {data.map((o) => <tr key={o.id}><td><Link className="row-link" href={`/manager/orders/${o.id}`} style={{ color: "var(--accent)" }}>{o.title}</Link></td><td>{new Date(o.created_at).toLocaleDateString("ru-RU")}</td><td>{o.contact_name}</td><td>{o.address}</td><td><StatusChip status={o.status as Status} /></td></tr>)}</tbody></table></div>}
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {page > 1 && <Link className="btn ghost sm" href={link(page - 1)}>← Назад</Link>}<span className="muted">Страница {page} из {pages} · всего {count ?? 0}</span>{page < pages && <Link className="btn ghost sm" href={link(page + 1)}>Вперёд →</Link>}</div></>);
}
