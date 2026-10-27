"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SB = Awaited<ReturnType<typeof createClient>>;
const id = z.string().uuid();
const STATUSES = ["new", "under_review", "awaiting_approval", "master_assigned", "in_progress", "awaiting_extra_work_approval", "completed", "cancelled"] as const;

function done(path: string, err?: string): never {
  revalidatePath(path);
  redirect(err ? `${path}?err=${encodeURIComponent(err)}` : `${path}?ok=1`);
}
// Общая обёртка: роль проверяется на сервере в КАЖДОМ действии, ввод валидируется, ошибки БД показываются пользователю.
async function run<T extends z.ZodTypeAny>(fd: FormData, schema: T, path: (d: z.infer<T>) => string, fn: (d: z.infer<T>, sb: SB, uid: string) => Promise<string | void>): Promise<never> {
  const p = await requireRole(["manager", "admin"]);
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return done("/manager/orders", "Проверьте введённые данные");
  const sb = await createClient();
  const msg = await fn(parsed.data, sb, p.id);
  return done(path(parsed.data), msg || undefined);
}
const orderPath = (d: { orderId: string }) => `/manager/orders/${d.orderId}`;
const fail = (e: { message: string } | null) => (e ? e.message : undefined);

export const changeStatus = async (fd: FormData) => run(fd, z.object({ orderId: id, to: z.enum(STATUSES), reason: z.string().trim().max(500).optional() }), orderPath,
  async (d, sb) => fail((await sb.rpc("change_order_status", { p_order: d.orderId, p_new: d.to, p_reason: d.reason || null })).error));

export const assignMaster = async (fd: FormData) => run(fd, z.object({ orderId: id, masterId: id }), orderPath, async (d, sb) => {
  const { data: o } = await sb.from("orders").select("status").eq("id", d.orderId).single();
  if (!o) return "Заявка не найдена";
  if (o.status === "new") return "Сначала переведите заявку «На рассмотрении»";
  if (["completed", "cancelled"].includes(o.status)) return "Для закрытой заявки мастера назначить нельзя";
  const a = await sb.rpc("assign_master", { p_order: d.orderId, p_master: d.masterId });
  if (a.error) return a.error.message;
  if (["under_review", "awaiting_approval"].includes(o.status)) return fail((await sb.rpc("change_order_status", { p_order: d.orderId, p_new: "master_assigned", p_reason: "назначен мастер" })).error);
});

export const setVisit = async (fd: FormData) => run(fd, z.object({ orderId: id, visitOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }), orderPath,
  async (d, sb) => fail((await sb.from("orders").update({ visit_on: d.visitOn }).eq("id", d.orderId)).error));

export const newEstimate = async (fd: FormData) => run(fd, z.object({ orderId: id }), orderPath, async (d, sb) => fail((await sb.rpc("new_estimate_version", { p_order: d.orderId })).error));

export const addItem = async (fd: FormData) => run(fd, z.object({
  orderId: id, estimateId: id, description: z.string().trim().min(2).max(300), unit: z.enum(["m2", "m", "pcs", "fixed"]),
  qty: z.coerce.number().min(0).max(1000000), unitPrice: z.coerce.number().min(0).max(100000000), note: z.string().trim().max(300).optional(),
}), orderPath, async (d, sb) => fail((await sb.from("estimate_items").insert({ estimate_id: d.estimateId, description: d.description, unit: d.unit, qty: d.qty, unit_price: d.unitPrice, note: d.note || null })).error));

export const removeItem = async (fd: FormData) => run(fd, z.object({ orderId: id, itemId: id }), orderPath, async (d, sb) => fail((await sb.from("estimate_items").delete().eq("id", d.itemId)).error));
export const sendEstimate = async (fd: FormData) => run(fd, z.object({ orderId: id, estimateId: id }), orderPath, async (d, sb) => fail((await sb.rpc("send_estimate", { p_estimate: d.estimateId })).error));
export const addNote = async (fd: FormData) => run(fd, z.object({ orderId: id, body: z.string().trim().min(1).max(2000) }), orderPath,
  async (d, sb, uid) => fail((await sb.from("manager_notes").insert({ order_id: d.orderId, author_id: uid, body: d.body })).error));

export const moderateReview = async (fd: FormData) => run(fd, z.object({ id, status: z.enum(["approved", "hidden"]) }), () => "/manager/reviews",
  async (d, sb) => fail((await sb.rpc("moderate_review", { p_id: d.id, p_status: d.status })).error));
export const updateService = async (fd: FormData) => run(fd, z.object({ id, price: z.coerce.number().min(0).max(100000000), published: z.string().optional() }), () => "/manager/prices",
  async (d, sb) => fail((await sb.rpc("update_service", { p_id: d.id, p_price: d.price, p_published: d.published === "on" })).error));

export const toggleGallery = async (fd: FormData) => run(fd, z.object({ id, published: z.enum(["1", "0"]) }), () => "/manager/gallery",
  async (d, sb) => fail((await sb.from("gallery_items").update({ is_published: d.published === "1" }).eq("id", d.id)).error));
export const deleteGallery = async (fd: FormData) => run(fd, z.object({ id }), () => "/manager/gallery", async (d, sb) => {
  const { data } = await sb.from("gallery_items").select("storage_path").eq("id", d.id).maybeSingle();
  const r = await sb.from("gallery_items").delete().eq("id", d.id);
  if (r.error) return r.error.message;
  if (data?.storage_path) await sb.storage.from("gallery").remove([data.storage_path]);
});
