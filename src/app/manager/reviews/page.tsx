import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/States";
import { moderateReview } from "@/app/actions/manager";
export const metadata = { title: "Отзывы" };
const ST = { pending: "на модерации", approved: "опубликован", hidden: "скрыт" } as const;

export default async function Reviews({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { err } = await searchParams;
  const sb = await createClient();
  const { data } = await sb.from("reviews").select("id,order_id,rating,body,status,created_at").order("created_at", { ascending: false }).limit(50);
  return (<><h2>Отзывы</h2>{err && <p className="err" role="alert">⚠ {err}</p>}
    {!data?.length ? <EmptyState title="Отзывов пока нет" hint="Они появятся после завершения заказов клиентами." /> : data.map((r) => (
      <div className="card" key={r.id}><div>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} <span className="chip" style={{ ["--c" as string]: r.status === "approved" ? "var(--success)" : r.status === "hidden" ? "var(--text-2)" : "var(--warning)" }}>{ST[r.status as keyof typeof ST]}</span></div>
        <p>{r.body}</p><div style={{ display: "flex", gap: 8 }}>
          {r.status !== "approved" && <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="approved" /><button className="btn sm">Опубликовать</button></form>}
          {r.status !== "hidden" && <form action={moderateReview}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="hidden" /><button className="btn ghost sm">Скрыть</button></form>}</div></div>))}</>);
}
