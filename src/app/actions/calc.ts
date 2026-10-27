"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculate, type Unit } from "@/lib/pricing";

export type CalcResult =
  | { ok: true; totalCents: number; lines: { name: string; unit: Unit; quantity: number; unitPriceCents: number; totalCents: number }[] }
  | { ok: false; error: string };

const schema = z.array(z.object({ id: z.string().uuid(), quantity: z.number().finite().min(0).max(100000) })).min(1).max(30);

// Цены берутся из БД (только опубликованные услуги). Цены из браузера не принимаются.
export async function calcAction(raw: unknown): Promise<CalcResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Выберите услуги и укажите корректное количество" };
  const sb = await createClient();
  const ids = parsed.data.map((i) => i.id);
  const { data, error } = await sb.from("services").select("id,name,unit,base_price").in("id", ids).eq("is_published", true).eq("is_archived", false);
  if (error || !data) return { ok: false, error: "Не удалось получить цены. Попробуйте ещё раз." };
  try {
    const prices = data.map((s) => ({ id: s.id as string, unit: s.unit as Unit, basePrice: s.base_price as number }));
    const r = calculate(prices, parsed.data);
    const name = new Map(data.map((s) => [s.id as string, s.name as string]));
    return { ok: true, totalCents: r.totalCents, lines: r.lines.map((l) => ({ name: name.get(l.id) ?? "", unit: l.unit, quantity: l.quantity, unitPriceCents: l.unitPriceCents, totalCents: l.totalCents })) };
  } catch {
    return { ok: false, error: "Проверьте количество: оно должно быть больше нуля" };
  }
}
