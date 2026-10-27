import { describe, it, expect } from "vitest";
import { telLink, telegramLink, whatsappLink } from "./contacts";
describe("contacts", () => {
  it("телефон", () => { expect(telLink("+7 (900) 000-00-00")).toBe("tel:+79000000000"); expect(telLink("abc")).toBeNull(); });
  it("telegram", () => { expect(telegramLink("@petr_master")).toBe("https://t.me/petr_master"); expect(telegramLink("a b")).toBeNull(); });
  it("whatsapp", () => { expect(whatsappLink("+79000000000")).toBe("https://wa.me/79000000000"); expect(whatsappLink("")).toBeNull(); });
});
