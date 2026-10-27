import { requireRole } from "@/lib/auth";
import { SideNav } from "@/components/SideNav";
export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["manager", "admin"]);
  return (<div className="shell"><SideNav items={[{ href: "/manager", label: "Обзор" }, { href: "/manager/orders", label: "Заявки" }, { href: "/manager/gallery", label: "Фото" }, { href: "/manager/reviews", label: "Отзывы" }, { href: "/manager/prices", label: "Прайс-лист" }]} /><div className="pad">{children}</div></div>);
}
