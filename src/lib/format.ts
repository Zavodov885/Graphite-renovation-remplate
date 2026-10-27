import type { Unit } from "@/lib/pricing";
export const UNIT_LABEL: Record<Unit, string> = { m2: "м²", m: "пог. м", pcs: "шт.", fixed: "услуга" };
export const UNIT_FOR: Record<Unit, string> = { m2: "за м²", m: "за пог. м", pcs: "за шт.", fixed: "за услугу" };
export const rub = (cents: number) => `${(cents / 100).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
