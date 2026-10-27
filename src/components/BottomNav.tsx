import { getProfile, homePath } from "@/lib/auth";
import { BottomNavClient, type NavItem } from "@/components/BottomNavClient";

// Нижнее меню на телефоне: одним нажатием в любой раздел. Последний пункт зависит от входа.
export async function BottomNav() {
  const p = await getProfile();
  const items: NavItem[] = [
    { href: "/", label: "Главная", icon: "home" }, { href: "/#calc", label: "Расчёт", icon: "calc" },
    { href: "/gallery", label: "Фото", icon: "photos" }, { href: "/#price", label: "Прайс", icon: "price" },
    p ? { href: homePath(p.role), label: "Кабинет", icon: "user" } : { href: "/login", label: "Войти", icon: "login" },
  ];
  return <BottomNavClient items={items} />;
}
