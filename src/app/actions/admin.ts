"use server";
import { z } from "zod";
import { runAction } from "@/lib/run-action";

const id = z.string().uuid();
const roles = ["admin" as const];
const err = (e: { message: string } | null) => (e ? e.message : undefined);
const txt = (n: number) => z.string().trim().max(n);

export const setRole = async (fd: FormData) => runAction(roles, fd, z.object({ userId: id, role: z.enum(["client", "master", "manager", "admin"]) }), () => "/admin", "/admin",
  async (d, sb) => err((await sb.rpc("set_user_role", { p_user: d.userId, p_role: d.role })).error));
export const setBlocked = async (fd: FormData) => runAction(roles, fd, z.object({ userId: id, blocked: z.enum(["1", "0"]) }), () => "/admin", "/admin",
  async (d, sb) => err((await sb.rpc("set_user_blocked", { p_user: d.userId, p_blocked: d.blocked === "1" })).error));
export const saveCompany = async (fd: FormData) => runAction(roles, fd, z.object({ name: txt(100), phone: txt(30), email: txt(100), address: txt(200), hours: txt(100), legal: txt(500) }), () => "/admin/settings", "/admin/settings",
  async (d, sb) => err((await sb.rpc("update_company_settings", { p_name: d.name, p_phone: d.phone, p_email: d.email, p_address: d.address, p_hours: d.hours, p_legal: d.legal })).error));
export const addCategory = async (fd: FormData) => runAction(roles, fd, z.object({ name: txt(100).min(2) }), () => "/admin/catalog", "/admin/catalog",
  async (d, sb) => err((await sb.rpc("create_category", { p_name: d.name })).error));
export const addService = async (fd: FormData) => runAction(roles, fd, z.object({ categoryId: id, name: txt(200).min(2), unit: z.enum(["m2", "m", "pcs", "fixed"]), price: z.coerce.number().min(0).max(100000000), note: txt(300), published: z.string().optional() }), () => "/admin/catalog", "/admin/catalog",
  async (d, sb) => err((await sb.rpc("create_service", { p_category: d.categoryId, p_name: d.name, p_unit: d.unit, p_price: d.price, p_note: d.note, p_published: d.published === "on" })).error));
export const archiveService = async (fd: FormData) => runAction(roles, fd, z.object({ serviceId: id, archived: z.enum(["1", "0"]) }), () => "/admin/catalog", "/admin/catalog",
  async (d, sb) => err((await sb.rpc("set_service_archived", { p_id: d.serviceId, p_archived: d.archived === "1" })).error));
