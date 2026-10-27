import { LoginForm } from "@/components/AuthForms";
import { safeNext } from "@/lib/validation/auth";
export const metadata = { title: "Вход" };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <main className="wrap"><LoginForm next={safeNext(next) ?? undefined} /></main>;
}
