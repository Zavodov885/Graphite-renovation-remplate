import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "@/components/ui/StatusChip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";
import type { Status } from "@/lib/status";
export const metadata = { title: "Мои заявки" };

export default async function Cabinet() {
  await requireRole(["client"]);
  const sb = await createClient();
  const { data, error } = await sb.from("orders").select("id,title,address,status,created_at,calc_total").order("created_at", { ascending: false }).limit(50); // RLS: только свои
  return (<main className="wrap" style={{ padding: "24px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><h2>Мои заявки</h2><LinkButton href="/cabinet/new">Новая заявка</LinkButton></div>
    {error ? <ErrorState message="Не удалось загрузить заявки." /> : !data?.length ? <EmptyState title="Заявок пока нет" hint="Создайте первую заявку, и она появится здесь." href="/cabinet/new" action="Создать заявку" /> :
    <div className="table-wrap card"><table><thead><tr><th>Работы</th><th>Дата</th><th>Адрес</th><th>Предв. стоимость</th><th>Статус</th></tr></thead><tbody>
      {data.map((o) => <tr key={o.id}><td><Link className="row-link" href={`/cabinet/${o.id}`} style={{ color: "var(--accent)" }}>{o.title}</Link></td><td>{new Date(o.created_at).toLocaleDateString("ru-RU")}</td><td>{o.address}</td><td>{o.calc_total != null ? `${Number(o.calc_total).toLocaleString("ru-RU")} ₽` : "—"}</td><td><StatusChip status={o.status as Status} /></td></tr>)}</tbody></table></div>}
  </main>);
}
