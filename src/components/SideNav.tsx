"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SideNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return <nav className="side">{items.map((i) => { const on = i.href === items[0]?.href ? path === i.href : path.startsWith(i.href); return <Link key={i.href} href={i.href} className={on ? "on" : ""}>{i.label}</Link>; })}</nav>;
}
