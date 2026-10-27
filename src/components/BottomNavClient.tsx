"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator, Home, Images, LogIn, Tag, User } from "lucide-react";

const ICONS = { home: Home, calc: Calculator, photos: Images, price: Tag, user: User, login: LogIn } as const;
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS };

export function BottomNavClient({ items }: { items: NavItem[] }) {
  const path = usePathname();
  if (["/manager", "/master", "/admin"].some((p) => path.startsWith(p))) return null; // у кабинетов сотрудников своё нижнее меню
  const active = (h: string) => (h === "/" ? path === "/" : h.includes("#") ? false : path === h || path.startsWith(`${h}/`));
  return (<><nav className="bottom-nav" aria-label="Основное меню">
    {items.map((i) => { const Icon = ICONS[i.icon]; return <Link key={i.label} href={i.href} className={active(i.href) ? "on" : ""} aria-current={active(i.href) ? "page" : undefined}><Icon aria-hidden /><span>{i.label}</span></Link>; })}
  </nav><div className="bn-spacer" aria-hidden /></>);
}
