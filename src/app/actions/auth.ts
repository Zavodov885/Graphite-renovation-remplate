"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, homePath } from "@/lib/auth";
import { CONSENT_VERSION, loginSchema, registerSchema, safeNext } from "@/lib/validation/auth";

export interface FormState { error?: string; info?: string }

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return { error: "Проверьте email и пароль" };
  const sb = await createClient();
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Неверный email или пароль" };
  const p = await getProfile();
  if (!p) { await sb.auth.signOut(); return { error: "Доступ к аккаунту закрыт" }; }
  redirect(safeNext(fd.get("next")) ?? homePath(p.role));
}

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({ full_name: fd.get("full_name"), email: fd.get("email"), password: fd.get("password"), consent: fd.get("consent") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  const sb = await createClient();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email, password: parsed.data.password,
    // Роль в метаданные НЕ передаётся: профиль всегда создаётся как client.
    options: { data: { full_name: parsed.data.full_name, consent_version: CONSENT_VERSION } },
  });
  if (error) { console.error("signUp failed:", error.message); return { error: "Не удалось создать аккаунт. Возможно, этот email уже используется." }; }
  if (data.session) redirect("/cabinet");
  return { info: "Аккаунт создан. Подтвердите email по ссылке из письма и войдите." };
}

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/");
}
