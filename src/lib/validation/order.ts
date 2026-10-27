import { z } from "zod";
const today = () => new Date().toISOString().slice(0, 10);
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export const orderSchema = z.object({
  title: z.string().trim().min(3, "Укажите, что нужно сделать").max(200, "Слишком длинное название"),
  categoryId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().min(5, "Укажите адрес объекта").max(300),
  phone: z.string().trim().regex(/^\+?[0-9 ()\-]{7,20}$/, "Некорректный телефон"),
  preferredDate: z.string().optional().refine((v) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= today()), "Дата не может быть в прошлом"),
  description: z.string().trim().max(5000, "Описание слишком длинное").optional(),
  consent: z.literal(true, { errorMap: () => ({ message: "Нужно согласие на обработку данных" }) }),
  idempotencyKey: z.string().uuid(),
  calcItems: z.array(z.object({ id: z.string().uuid(), quantity: z.number().finite().min(0).max(100000) })).max(30).optional(),
});
