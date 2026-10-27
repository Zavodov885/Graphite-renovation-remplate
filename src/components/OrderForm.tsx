"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/actions/orders";
import { calcAction, type CalcResult } from "@/app/actions/calc";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_MIME, MAX_FILES, MAX_FILE_BYTES } from "@/lib/validation/order";
import { rub, UNIT_LABEL } from "@/lib/format";

type Item = { id: string; quantity: number };
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function OrderForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [key] = useState(() => crypto.randomUUID()); // один ключ на форму: защита от дублей
  const [calc, setCalc] = useState<{ items: Item[]; res: CalcResult } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("calc"); if (!raw) return;
      const items = JSON.parse(raw) as Item[];
      calcAction(items).then((res) => setCalc({ items, res }));
    } catch { /* нет сохранённого расчёта */ }
  }, []);

  function onFiles(list: FileList | null) {
    const arr = Array.from(list ?? []); setError("");
    if (arr.length > MAX_FILES) return setError(`Не более ${MAX_FILES} фото`);
    const bad = arr.find((f) => !(ALLOWED_MIME as readonly string[]).includes(f.type) || f.size > MAX_FILE_BYTES);
    if (bad) return setError("Только JPG, PNG или WebP, не больше 10 МБ каждое");
    setFiles(arr);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      setError("");
      const r = await createOrder({
        title: fd.get("title"), categoryId: fd.get("categoryId"), address: fd.get("address"), phone: fd.get("phone"),
        preferredDate: fd.get("preferredDate") || undefined, description: fd.get("description"), consent: fd.get("consent") === "on",
        idempotencyKey: key, calcItems: calc?.res.ok ? calc.items : undefined,
      });
      if (!r.ok) return setError(r.error);
      let failed = 0;
      if (files.length) {
        const sb = createClient();
        const { data: { user } } = await sb.auth.getUser();
        for (const f of files) {
          const path = `${r.orderId}/${crypto.randomUUID()}.${EXT[f.type]}`;
          const up = await sb.storage.from("order-photos").upload(path, f, { contentType: f.type });
          if (up.error || !user) { failed++; continue; }
          const ins = await sb.from("order_attachments").insert({ order_id: r.orderId, uploaded_by: user.id, stage: "client", storage_path: path });
          if (ins.error) failed++;
        }
      }
      sessionStorage.removeItem("calc");
      router.push(`/cabinet/${r.orderId}${failed ? "?upload=failed" : ""}`);
    });
  }

  return (<form onSubmit={submit} data-no-busy className="card" style={{ maxWidth: 620, margin: "24px auto" }}>
    <h2>Новая заявка</h2>
    {calc?.res.ok && (<div className="card" style={{ background: "var(--surface-2)" }}><h3>Предварительный расчёт</h3>
      {calc.res.lines.map((l, i) => <div key={i} className="muted">{l.name}: {l.quantity} {UNIT_LABEL[l.unit]} — {rub(l.totalCents)}</div>)}
      <b>Итого предварительно: {rub(calc.res.totalCents)}</b><p className="muted">Итоговая смета уточняется после осмотра.</p></div>)}
    <label className="field">Что нужно сделать<input className="input" name="title" required minLength={3} maxLength={200} /></label>
    <label className="field">Тип ремонта<select className="input" name="categoryId" defaultValue=""><option value="">Не выбрано</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="field">Адрес объекта<input className="input" name="address" required minLength={5} autoComplete="street-address" /></label>
    <label className="field">Телефон<input className="input" name="phone" type="tel" required autoComplete="tel" /></label>
    <label className="field">Желаемая дата визита (необязательно)<input className="input" name="preferredDate" type="date" /></label>
    <label className="field">Описание<textarea className="input" name="description" rows={4} maxLength={5000} /></label>
    <label className="field">Фото объекта (до {MAX_FILES} шт., JPG/PNG/WebP, до 10 МБ)<input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onFiles(e.target.files)} /></label>
    {files.length > 0 && <p className="muted">Выбрано файлов: {files.length}</p>}
    <label className="field" style={{ display: "flex", gap: 10 }}><input type="checkbox" name="consent" required style={{ marginTop: 4 }} /><span>Согласен на <a href="/consent" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>обработку персональных данных</a> и принимаю <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>политику</a></span></label>
    {error && <p className="err" role="alert">⚠ {error}</p>}
    <button className="btn" style={{ width: "100%" }} disabled={pending} aria-busy={pending}>{pending ? "Отправляем…" : "Отправить заявку"}</button>
  </form>);
}
