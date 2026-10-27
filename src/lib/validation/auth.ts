import { z } from "zod";
export const CONSENT_VERSION = "2026-10-draft"; // черновик, требует юридической проверки
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });
export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Укажите имя").max(100),
  email: z.string().trim().toLowerCase().email("Некорректный email").max(200),
  password: z.string().min(8, "Пароль: минимум 8 символов").max(200),
  consent: z.literal("on", { errorMap: () => ({ message: "Нужно согласие на обработку данных" }) }),
});
// Разрешаем только внутренние пути вида /abc/def (защита от open redirect).
export const safeNext = (v: unknown) => (typeof v === "string" && /^\/(?!\/)[\w\-/]*$/.test(v) ? v : null);
