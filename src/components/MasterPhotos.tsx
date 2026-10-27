"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_MIME, MAX_FILE_BYTES, MAX_FILES } from "@/lib/validation/order";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function MasterPhotos({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [stage, setStage] = useState("during");
  const [files, setFiles] = useState<File[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();

  function pick(list: FileList | null) {
    const arr = Array.from(list ?? []); setMsg(null);
    if (arr.length > MAX_FILES) return setMsg({ ok: false, t: `Не более ${MAX_FILES} фото за раз` });
    if (arr.some((f) => !(ALLOWED_MIME as readonly string[]).includes(f.type) || f.size > MAX_FILE_BYTES)) return setMsg({ ok: false, t: "Только JPG, PNG или WebP до 10 МБ" });
    setFiles(arr);
  }
  const upload = () => start(async () => {
    const sb = createClient(); const { data: { user } } = await sb.auth.getUser();
    if (!user) return setMsg({ ok: false, t: "Войдите заново" });
    let failed = 0;
    for (const f of files) {
      const path = `${orderId}/${crypto.randomUUID()}.${EXT[f.type]}`;
      const up = await sb.storage.from("order-photos").upload(path, f, { contentType: f.type });
      const ins = up.error ? null : await sb.from("order_attachments").insert({ order_id: orderId, uploaded_by: user.id, stage, storage_path: path });
      if (up.error || ins?.error) failed++;
    }
    setFiles([]); setMsg(failed ? { ok: false, t: `Не загрузилось файлов: ${failed}` } : { ok: true, t: "Фото загружены" }); router.refresh();
  });

  return (<div><div className="row-f">
    <label className="field">Этап<select className="input" value={stage} onChange={(e) => setStage(e.target.value)}><option value="before">До начала работ</option><option value="during">Во время работ</option><option value="after">После работ</option></select></label>
    <label className="field">Фото<input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => pick(e.target.files)} /></label>
    <button className="btn" style={{ marginBottom: 12 }} onClick={upload} disabled={!files.length || pending} aria-busy={pending}>{pending ? "Загружаем…" : `Загрузить (${files.length})`}</button></div>
    {msg && <p className={msg.ok ? "" : "err"} role={msg.ok ? "status" : "alert"} style={msg.ok ? { color: "var(--success)" } : undefined}>{msg.ok ? "✓" : "⚠"} {msg.t}</p>}</div>);
}
