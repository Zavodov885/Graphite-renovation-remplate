// Деньги считаем в копейках (целые числа). Округление: half-up до копейки на уровне позиции.
export type Unit = "m2" | "m" | "pcs" | "fixed";
export interface PriceItem { id: string; unit: Unit; basePrice: string | number }
export interface CalcInput { id: string; quantity: number }
export interface CalcLine { id: string; unit: Unit; quantity: number; unitPriceCents: number; totalCents: number }

export const toCents = (v: string | number) => Math.round(Number(v) * 100);

export function calculate(prices: PriceItem[], inputs: CalcInput[]) {
  const byId = new Map(prices.map((p) => [p.id, p]));
  const lines: CalcLine[] = inputs.map((i) => {
    const p = byId.get(i.id);
    if (!p) throw new Error(`Unknown or unavailable service: ${i.id}`);
    if (p.unit !== "fixed" && (!Number.isFinite(i.quantity) || i.quantity <= 0)) throw new Error("Quantity must be > 0");
    const qty = p.unit === "fixed" ? 1 : i.quantity;
    const unitPriceCents = toCents(p.basePrice);
    return { id: p.id, unit: p.unit, quantity: qty, unitPriceCents, totalCents: Math.round(qty * unitPriceCents) };
  });
  return { lines, totalCents: lines.reduce((s, l) => s + l.totalCents, 0) };
}
