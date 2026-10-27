import { describe, it, expect } from "vitest";
import { calculate } from "./pricing";
import { canTransition } from "./status";
const prices = [{ id: "a", unit: "m2" as const, basePrice: "450.50" }, { id: "b", unit: "fixed" as const, basePrice: 1000 }];
describe("pricing", () => {
  it("считает площадь × цена без дрейфа float", () => expect(calculate(prices, [{ id: "a", quantity: 10.5 }]).totalCents).toBe(473025));
  it("fixed игнорирует количество", () => expect(calculate(prices, [{ id: "b", quantity: 0 }]).totalCents).toBe(100000));
  it("отклоняет отрицательное и неизвестную услугу", () => {
    expect(() => calculate(prices, [{ id: "a", quantity: -1 }])).toThrow();
    expect(() => calculate(prices, [{ id: "zzz", quantity: 1 }])).toThrow();
  });
});
describe("status", () => {
  it("мастер не завершает заказ", () => expect(canTransition("in_progress", "completed", "master")).toBe(false));
  it("клиент не назначает мастера", () => expect(canTransition("under_review", "master_assigned", "client")).toBe(false));
  it("менеджер ведёт заказ", () => expect(canTransition("new", "under_review", "manager")).toBe(true));
});
