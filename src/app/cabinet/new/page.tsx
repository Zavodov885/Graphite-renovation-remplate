import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/OrderForm";
export const metadata = { title: "Новая заявка" };
export default async function NewOrder() {
  await requireRole(["client"]);
  const sb = await createClient();
  const { data } = await sb.from("service_categories").select("id,name").eq("is_published", true).order("sort");
  return <main className="wrap"><OrderForm categories={data ?? []} /></main>;
}
