import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/status";

export type SB = Awaited<ReturnType<typeof createClient>>;
function finish(path: string, err?: string): never { revalidatePath(path); redirect(err ? `${path}?err=${encodeURIComponent(err)}` : `${path}?ok=1`); }

// Роль проверяется на сервере при каждом действии; ввод валидируется; ошибки БД возвращаются на страницу.
export async function runAction<T extends z.ZodTypeAny>(roles: Role[], fd: FormData, schema: T, path: (d: z.infer<T>) => string, fallback: string,
  fn: (d: z.infer<T>, sb: SB, uid: string) => Promise<string | void>): Promise<never> {
  const p = await requireRole(roles);
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return finish(fallback, "Проверьте введённые данные");
  const sb = await createClient();
  const msg = await fn(parsed.data, sb, p.id);
  return finish(path(parsed.data), msg || undefined);
}
