import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/States";
export const metadata = { title: "Журнал действий" };
const ACT: Record<string, string> = { status_change: "Смена статуса заказа", assign_master: "Назначение мастера", order_created: "Создана заявка", estimate_version_created: "Новая версия сметы", estimate_sent: "Смета отправлена клиенту",
  decide_estimate: "Решение клиента по смете", extra_work_proposed: "Предложены доп. работы", decide_extra_work: "Решение по доп. работам", review_moderated: "Модерация отзыва", service_updated: "Изменена услуга",
  role_changed: "Изменена роль", user_blocked: "Блокировка доступа", company_updated: "Изменены настройки компании", category_created: "Создана категория", service_created: "Создана услуга", service_archived: "Услуга в архив/из архива" };

export default async function Log() {
  const sb = await createClient();
  const { data } = await sb.from("audit_logs").select("id,actor_id,action,entity,created_at").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((data ?? []).map((l) => l.actor_id).filter(Boolean))] as string[];
  const { data: people } = ids.length ? await sb.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p) => [p.id, p.full_name || p.email || "—"]));
  return (<><h2>Журнал действий</h2><p className="muted">Последние 100 записей. Пароли и ключи в журнал не попадают.</p>
    {!data?.length ? <EmptyState title="Записей пока нет" /> : <div className="card table-wrap"><table><thead><tr><th>Время</th><th>Кто</th><th>Действие</th></tr></thead><tbody>
      {data.map((l) => <tr key={l.id}><td>{new Date(l.created_at).toLocaleString("ru-RU")}</td><td>{l.actor_id ? who.get(l.actor_id) ?? "—" : "система"}</td><td>{ACT[l.action] ?? l.action}</td></tr>)}</tbody></table></div>}</>);
}
