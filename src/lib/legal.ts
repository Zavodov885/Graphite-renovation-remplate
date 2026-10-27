import { createClient } from "@/lib/supabase/server";
export { CONSENT_VERSION } from "@/lib/validation/auth";
export interface Operator { name: string | null; legal: string | null; email: string | null; phone: string | null; address: string | null }
export async function getOperator(): Promise<Operator> {
  const sb = await createClient();
  const { data } = await sb.from("company_settings").select("name,legal_details,email,phone,address").eq("id", 1).maybeSingle();
  return { name: data?.name ?? null, legal: data?.legal_details ?? null, email: data?.email ?? null, phone: data?.phone ?? null, address: data?.address ?? null };
}
