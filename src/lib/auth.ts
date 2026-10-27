import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/status";

export interface Profile { id: string; full_name: string; role: Role; is_blocked: boolean }
export const homePath = (r: Role) => ({ client: "/cabinet", master: "/master", manager: "/manager", admin: "/admin" })[r];

// Роль всегда берётся из таблицы profiles (не из метаданных Auth и не из запроса).
export const getProfile = cache(async (): Promise<Profile | null> => {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("id, full_name, role, is_blocked").eq("id", user.id).single();
  return data && !data.is_blocked ? (data as Profile) : null;
});

export async function requireRole(allowed: Role[]): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/login");
  if (!allowed.includes(p.role)) redirect("/forbidden");
  return p;
}
