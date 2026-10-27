"use server";
import { z } from "zod";
import { runAction } from "@/lib/run-action";

const id = z.string().uuid();
const path = (d: { orderId: string }) => `/cabinet/${d.orderId}`;
const roles = ["client" as const];
const err = (e: { message: string } | null) => (e ? e.message : undefined);

export const decideEstimate = async (fd: FormData) => runAction(roles, fd, z.object({ orderId: id, estimateId: id, approve: z.enum(["1", "0"]) }), path, "/cabinet",
  async (d, sb) => err((await sb.rpc("decide_estimate", { p_id: d.estimateId, p_approve: d.approve === "1" })).error));

export const decideExtra = async (fd: FormData) => runAction(roles, fd, z.object({ orderId: id, extraId: id, approve: z.enum(["1", "0"]) }), path, "/cabinet",
  async (d, sb) => err((await sb.rpc("decide_extra_work", { p_id: d.extraId, p_approve: d.approve === "1" })).error));

export const cancelOrder = async (fd: FormData) => runAction(roles, fd, z.object({ orderId: id, reason: z.string().trim().min(3, "Укажите причину").max(500) }), path, "/cabinet",
  async (d, sb) => err((await sb.rpc("change_order_status", { p_order: d.orderId, p_new: "cancelled", p_reason: d.reason })).error));

// Один отзыв на заказ: unique(order_id) в БД + политика RLS (заказ должен быть завершён и принадлежать клиенту).
export const submitReview = async (fd: FormData) => runAction(roles, fd, z.object({ orderId: id, rating: z.coerce.number().int().min(1).max(5), body: z.string().trim().min(3, "Напишите пару слов").max(3000) }), path, "/cabinet",
  async (d, sb, uid) => {
    const { error } = await sb.from("reviews").insert({ order_id: d.orderId, client_id: uid, rating: d.rating, body: d.body, status: "pending" });
    if (error) return error.code === "23505" ? "Отзыв по этому заказу уже оставлен" : "Не удалось отправить отзыв";
  });
