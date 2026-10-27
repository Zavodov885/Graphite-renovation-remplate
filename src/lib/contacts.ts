// Ссылки строятся только из валидных значений; иначе возвращается null (ссылка не показывается).
export const cleanPhone = (v?: string | null) => { const d = (v ?? "").replace(/[^\d+]/g, ""); return /^\+?\d{7,15}$/.test(d) ? d : null; };
export const telegramHandle = (v?: string | null) => { const h = (v ?? "").trim().replace(/^https?:\/\/t\.me\//, "").replace(/^@/, ""); return /^[A-Za-z0-9_]{5,32}$/.test(h) ? h : null; };
export const telLink = (v?: string | null) => { const p = cleanPhone(v); return p ? `tel:${p}` : null; };
export const telegramLink = (v?: string | null) => { const h = telegramHandle(v); return h ? `https://t.me/${h}` : null; };
export const whatsappLink = (v?: string | null) => { const p = cleanPhone(v); return p ? `https://wa.me/${p.replace("+", "")}` : null; };
