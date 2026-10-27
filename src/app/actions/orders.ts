"use server";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { calcAction } from "@/app/actions/calc";
import { orderSchema } from "@/lib/validation/order";
import { CONSENT_VERSION } from "@/lib/validation/auth";

export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

// Владелец и роль берутся из сессии; цена пересчитывается на сервере; повтор запроса не создаёт дубль (idempotencyKey).
export async function createOrder(raw: unknown): Promise<CreateOrderResult> {
  const p = await requireRole(["client"]);
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Проверьте данные" };
  const d = parsed.data;
  const sb = await createClient();

  let snapshot: unknown = null, total: number | null = null;
  if (d.calcItems?.length) {
    const r = await calcAction(d.calcItems);
    if (!r.ok) return { ok: false, error: r.error };
    snapshot = { lines: r.lines, totalCents: r.totalCents, calculatedAt: new Date().toISOString() };
    total = r.totalCents / 100;
  }
  const { data, error } = await sb.from("orders").insert({
    client_id: p.id, category_id: d.categoryId ?? null, title: d.title, description: d.description || null, address: d.address,
    contact_name: p.full_name || "Клиент", contact_phone: d.phone, preferred_date: d.preferredDate || null,
    calc_snapshot: snapshot, calc_total: total, idempotency_key: d.idempotencyKey,
  }).select("id").single();

  if (error) {
    if (error.code === "23505") { // повторная отправка той же формы
      const ex = await sb.from("orders").select("id").eq("client_id", p.id).eq("idempotency_key", d.idempotencyKey).single();
      if (ex.data) return { ok: true, orderId: ex.data.id };
    }
    console.error("createOrder failed:", error.message);
    return { ok: false, error: "Не удалось создать заявку. Попробуйте ещё раз." };
  }
  await sb.from("consents").insert({ user_id: p.id, doc_type: "order_personal_data", doc_version: CONSENT_VERSION });
  return { ok: true, orderId: data.id };
}
