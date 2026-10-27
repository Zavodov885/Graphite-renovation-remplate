import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState } from "@/components/ui/States";
import type { Status } from "@/lib/status";
export const metadata = { title: "Мои задания" };

export default async function Master() {
  const sb = await createClient();
  const { data } = await sb.from("orders").select("id,title,address,status,visit_on").order("created_at", { ascending: false }).limit(50); // RLS: только назначенные мне
  return (<><h2>Назначенные заказы</h2>
    {!data?.length ? <EmptyState title="Назначенных заказов нет" hint="Когда менеджер назначит вам заказ, он появится здесь." /> :
      <div className="card table-wrap"><table><thead><tr><th>Работы</th><th>Адрес</th><th>Визит</th><th>Статус</th></tr></thead><tbody>
        {data.map((o) => <tr key={o.id}><td><Link className="row-link" href={`/master/orders/${o.id}`} style={{ color: "var(--accent)" }}>{o.title}</Link></td><td>{o.address}</td><td>{o.visit_on ? new Date(o.visit_on).toLocaleDateString("ru-RU") : "—"}</td><td><StatusChip status={o.status as Status} /></td></tr>)}</tbody></table></div>}</>);
}
