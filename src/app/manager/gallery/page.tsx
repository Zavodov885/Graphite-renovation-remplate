import { createClient } from "@/lib/supabase/server";
import { GalleryUpload } from "@/components/GalleryUpload";
import { EmptyState } from "@/components/ui/States";
import { deleteGallery, toggleGallery } from "@/app/actions/manager";
export const metadata = { title: "Фото работ" };
const ST = { before: "до", during: "в процессе", after: "результат" } as const;

export default async function ManagerGallery({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const sb = await createClient();
  const [{ data: svcs }, { data: items }] = await Promise.all([
    sb.from("services").select("id,name").eq("is_archived", false).order("name"),
    sb.from("gallery_items").select("id,title,stage,storage_path,is_published,services(name)").order("created_at", { ascending: false }).limit(100),
  ]);
  return (<><h2>Фото работ</h2><p className="muted">Эти фото видят все посетители на странице «Фото работ».</p>{err && <p className="err" role="alert">⚠ {err}</p>}
    <GalleryUpload services={svcs ?? []} />
    {!items?.length ? <EmptyState title="Фото пока нет" hint="Загрузите первые фото выше." /> :
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
        {items.map((i) => { const s = Array.isArray(i.services) ? i.services[0] : i.services; return (<div className="card" key={i.id} style={{ padding: 10, margin: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/media/${i.storage_path}`} alt={i.title} loading="lazy" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 8 }} />
          <div><b>{i.title}</b></div><div className="muted">{s?.name} · {ST[i.stage as keyof typeof ST]} · {i.is_published ? "опубликовано" : "скрыто"}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <form action={toggleGallery}><input type="hidden" name="id" value={i.id} /><input type="hidden" name="published" value={i.is_published ? "0" : "1"} /><button className="btn ghost sm">{i.is_published ? "Скрыть" : "Показать"}</button></form>
            <form action={deleteGallery}><input type="hidden" name="id" value={i.id} /><button className="btn danger sm">Удалить</button></form></div></div>); })}</div>}</>);
}
