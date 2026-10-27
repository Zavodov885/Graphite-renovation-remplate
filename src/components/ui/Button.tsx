import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";
const cls = (v: Variant, sm?: boolean) => ["btn", v === "ghost" && "ghost", v === "danger" && "danger", sm && "sm"].filter(Boolean).join(" ");

export function Button({ variant = "primary", sm, pending, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; sm?: boolean; pending?: boolean }) {
  return <button {...p} disabled={p.disabled || pending} aria-busy={pending} className={cls(variant, sm)}>{pending ? "Сохраняем…" : children}</button>;
}
export function LinkButton({ href, variant = "primary", sm, children }: { href: string; variant?: Variant; sm?: boolean; children: React.ReactNode }) {
  return <Link href={href} className={cls(variant, sm)}>{children}</Link>;
}
