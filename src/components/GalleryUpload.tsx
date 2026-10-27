"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_MIME, MAX_FILE_BYTES } from "@/lib/validation/order";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function GalleryUpload({ services }: { services: { id: string; name: string }[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();

  function pick(list: FileList | null) {
    const arr = Array.from(list ?? []); setMsg(null);
    if (arr.length > 10) return setMsg({ ok: false, t: "Не более 10 фото за раз" });
    if (arr.some((f) => !(ALLOWED_MIME as readonly string[]).includes(f.type) || f.size > MAX_FILE_BYTES)) return setMsg({ ok: false, t: "Только JPG, PNG или WebP до 10 МБ" });
    setFiles(arr);
  }
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const fd = new FormData(form);
    if (!files.length) return setMsg({ ok: false, t: "Выберите фото" });
    start(async () => {
      const sb = createClient(); let failed = 0;
      for (const f of files) {
        const path = `${crypto.randomUUID()}.${EXT[f.type]}`;
        const up = await sb.storage.from("gallery").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
        if (up.error) { failed++; continue; }
        const ins = await sb.from("gallery_items").insert({ service_id: fd.get("serviceId"), title: String(fd.get("title")).trim(), description: String(fd.get("description") ?? "").trim() || null, stage: fd.get("stage"), storage_path: path, is_published: true });
        if (ins.error) { failed++; await sb.storage.from("gallery").remove([path]); }
      }
      setMsg(failed ? { ok: false, t: `Не загрузилось файлов: ${failed}` } : { ok: true, t: "Фото опубликованы" });
      if (!failed) { form.reset(); setFiles([]); }
      router.refresh();
    });
  }
  return (<form onSubmit={submit} data-no-busy className="card"><h3>Добавить фото</h3>
    <p className="muted">Публикуйте только фото своих работ. Фото клиентских заказов сюда добавлять нельзя без согласия клиента.</p>
    <label className="field">Вид работ<select className="input" name="serviceId" required>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="field">Этап<select className="input" name="stage"><option value="before">До начала</option><option value="during">В процессе</option><option value="after">Результат</option></select></label>
    <label className="field">Подпись<input className="input" name="title" required minLength={2} maxLength={120} /></label>
    <label className="field">Описание (необязательно)<input className="input" name="description" maxLength={500} /></label>
    <label className="field">Фото (до 10 шт.)<input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => pick(e.target.files)} /></label>
    {msg && <p className={msg.ok ? "" : "err"} role={msg.ok ? "status" : "alert"} style={msg.ok ? { color: "var(--success)" } : undefined}>{msg.ok ? "✓" : "⚠"} {msg.t}</p>}
    <button className="btn" disabled={pending} aria-busy={pending}>{pending ? "Загружаем…" : `Опубликовать (${files.length})`}</button></form>);
}
