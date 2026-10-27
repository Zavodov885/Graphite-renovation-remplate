import { requireRole } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["admin"]);
  return (<div className="shell"><SideNav items={[{ href: "/admin", label: "Пользователи" }, { href: "/admin/catalog", label: "Каталог" }, { href: "/admin/settings", label: "Настройки" }, { href: "/admin/log", label: "Журнал" }, { href: "/manager", label: "Заявки →" }]} /><div className="pad">{children}</div></div>);
}
