"use server";
import { z } from "zod";
import { runAction } from "@/lib/run-action";
import { cleanPhone, telegramHandle } from "@/lib/contacts";

const id = z.string().uuid();
const roles = ["master" as const];
const path = (d: { orderId: string }) => `/master/orders/${d.orderId}`;
const err = (e: { message: string } | null) => (e ? e.message : undefined);

export const startWork = async (fd: FormData) => runAction(roles, fd, z.object({ orderId: id }), path, "/master",
  async (d, sb) => err((await sb.rpc("change_order_status", { p_order: d.orderId, p_new: "in_progress", p_reason: "мастер начал работу" })).error));

export const proposeExtra = async (fd: FormData) => runAction(roles, fd, z.object({
  orderId: id, description: z.string().trim().min(3).max(300), qty: z.coerce.number().gt(0).max(1000000), price: z.coerce.number().min(0).max(100000000), reason: z.string().trim().min(3, "Укажите причину").max(500),
}), path, "/master", async (d, sb) => err((await sb.rpc("propose_extra_work", { p_order: d.orderId, p_desc: d.description, p_qty: d.qty, p_price: d.price, p_reason: d.reason })).error));

export const saveProfile = async (fd: FormData) => runAction(roles, fd, z.object({
  full_name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30), contact_telegram: z.string().trim().max(60), contact_whatsapp: z.string().trim().max(30), contact_max: z.string().trim().max(64),
}), () => "/master/profile", "/master/profile", async (d, sb, uid) => {
  if (d.phone && !cleanPhone(d.phone)) return "Некорректный телефон";
  if (d.contact_whatsapp && !cleanPhone(d.contact_whatsapp)) return "Некорректный номер WhatsApp";
  if (d.contact_telegram && !telegramHandle(d.contact_telegram)) return "Telegram: 5–32 символа, латиница, цифры, _";
  // role/is_blocked менять нельзя: защищено триггером БД
  return err((await sb.from("profiles").update({ full_name: d.full_name, phone: d.phone || null, contact_telegram: d.contact_telegram || null, contact_whatsapp: d.contact_whatsapp || null, contact_max: d.contact_max || null }).eq("id", uid)).error);
});
