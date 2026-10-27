import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/States";
import { STATUS_LABEL, type Status } from "@/lib/status";
export const metadata = { title: "Обзор" };

export default async function Manager() {
  const sb = await createClient();
  const keys: Status[] = ["new", "under_review", "in_progress", "completed"];
  const counts = await Promise.all(keys.map(async (s) => (await sb.from("orders").select("id", { count: "exact", head: true }).eq("status", s)).count ?? 0));
  const { data: todo } = await sb.from("orders").select("id,title,address,status,created_at").in("status", ["new", "under_review"]).order("created_at").limit(8);
  return (<><h2>Обзор</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
      {keys.map((s, i) => <div className="card" key={s} style={i === 0 ? { boxShadow: "inset 0 2px 0 var(--accent)" } : undefined}><span className="muted">{STATUS_LABEL[s]}</span><div style={{ fontSize: 30, fontWeight: 700, color: i === 0 ? "var(--accent)" : undefined }}>{counts[i]}</div></div>)}</div>
    <h3 style={{ marginTop: 16 }}>Требуют действия</h3>
    {!todo?.length ? <EmptyState title="Всё обработано" hint="Новых заявок и заявок на рассмотрении нет." /> : <div className="card table-wrap"><table><tbody>
      {todo.map((o) => <tr key={o.id}><td><Link className="row-link" href={`/manager/orders/${o.id}`} style={{ color: "var(--accent)" }}>{o.title}</Link></td><td>{o.address}</td><td><StatusChip status={o.status as Status} /></td></tr>)}</tbody></table></div>}</>);
}
