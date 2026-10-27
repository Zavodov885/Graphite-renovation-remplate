import { requireRole } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["master"]);
  return (<div className="shell"><SideNav items={[{ href: "/master", label: "Задания" }, { href: "/master/profile", label: "Мой профиль" }]} /><div className="pad">{children}</div></div>);
}
