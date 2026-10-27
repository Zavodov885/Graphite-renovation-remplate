import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { setBlocked, setRole } from "@/app/actions/admin";
export const metadata = { title: "Пользователи" };
const ROLE_RU = { client: "Клиент", master: "Мастер", manager: "Менеджер", admin: "Администратор" } as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const me = await requireRole(["admin"]); const { err } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("profiles").select("id,full_name,email,role,is_blocked,created_at").order("created_at").limit(200);
  return (<><h2>Пользователи</h2><p className="muted">Публичная регистрация создаёт только клиентов. Роли сотрудников назначаете здесь.</p>
    {err && <p className="err" role="alert">⚠ {err}</p>}
    <div className="card table-wrap"><table><thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th>Доступ</th></tr></thead><tbody>
      {data?.map((u) => { const self = u.id === me.id; return (<tr key={u.id}><td>{u.full_name || "—"}{self && <span className="muted"> (вы)</span>}</td><td>{u.email ?? "—"}</td>
        <td>{self ? ROLE_RU[u.role as keyof typeof ROLE_RU] : <form action={setRole} className="row-f" style={{ alignItems: "center" }}><input type="hidden" name="userId" value={u.id} />
          <select className="input" name="role" defaultValue={u.role} aria-label={`Роль: ${u.full_name}`}>{Object.entries(ROLE_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><button className="btn ghost sm">Применить</button></form>}</td>
        <td>{self ? "Активен" : <form action={setBlocked}><input type="hidden" name="userId" value={u.id} /><input type="hidden" name="blocked" value={u.is_blocked ? "0" : "1"} />
          <button className={u.is_blocked ? "btn sm" : "btn danger sm"}>{u.is_blocked ? "Разблокировать" : "Заблокировать"}</button></form>}{u.is_blocked && <span className="chip" style={{ ["--c" as string]: "var(--danger)", marginLeft: 8 }}>Заблокирован</span>}</td></tr>); })}</tbody></table></div></>);
}
