import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, ErrorState } from "@/components/ui/States";
export const metadata = { title: "Фото работ", description: "Как выглядит ремонт: до, в процессе и после" };
export const dynamic = "force-dynamic";
const STAGES = [["before", "До начала"], ["during", "В процессе"], ["after", "Результат"]] as const;
type Item = { id: string; title: string; description: string | null; stage: string; storage_path: string; service_id: string | null };

export default async function Gallery({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const sb = await createClient();
  const { data: svcs } = await sb.from("services").select("id,name,slug").eq("is_published", true).eq("is_archived", false).order("name");
  const sel = svcs?.find((s) => s.slug === service);
  let q = sb.from("gallery_items").select("id,title,description,stage,storage_path,service_id").eq("is_published", true).order("created_at", { ascending: true }).limit(300);
  if (sel) q = q.eq("service_id", sel.id);
  const { data, error } = await q;
  const items = (data ?? []) as Item[];
  const groups = (svcs ?? []).map((s) => ({ s, items: items.filter((i) => i.service_id === s.id) })).filter((g) => g.items.length);
  return (<main className="wrap" style={{ padding: "24px 20px 48px" }}>
    <h1 style={{ fontSize: 32 }}>Как делается ремонт</h1>
    <p className="muted">Выберите вид работ и посмотрите фото: как выглядит помещение до, в процессе и после.</p>
    <div className="chips-grid" style={{ marginBottom: 16 }}>
      <Link href="/gallery" className={`btn sm ${sel ? "ghost" : ""}`} style={{ flex: "none" }}>Все</Link>
      {svcs?.map((s) => <Link key={s.id} href={`/gallery?service=${s.slug}`} className={`btn sm ${sel?.id === s.id ? "" : "ghost"}`} style={{ flex: "none" }}>{s.name}</Link>)}</div>
    {error ? <ErrorState message="Не удалось загрузить фото. Обновите страницу." /> : !groups.length ? <EmptyState title="Фото скоро появятся" hint="По выбранному виду работ пока нет опубликованных фотографий." /> :
      groups.map(({ s, items: list }) => (<section key={s.id} style={{ marginBottom: 28 }}><h2>{s.name}</h2>
        {STAGES.map(([st, label]) => { const part = list.filter((i) => i.stage === st); return part.length ? (<div key={st}><h3 className="muted">{label}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12, marginBottom: 12 }}>
            {part.map((i) => (<figure key={i.id} style={{ margin: 0 }}><a href={`/media/${i.storage_path}`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${i.storage_path}`} alt={`${s.name}: ${i.title}`} loading="lazy" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} /></a>
              <figcaption><b>{i.title}</b>{i.description && <div className="muted">{i.description}</div>}</figcaption></figure>))}</div></div>) : null; })}</section>))}
    <Link href="/#calc" className="btn">Рассчитать стоимость</Link>
  </main>);
}
