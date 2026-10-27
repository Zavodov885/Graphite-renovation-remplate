"use client";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
// Только на телефоне и не на главной: возвращает на предыдущую страницу (или на главную, если истории нет).
export function BackButton() {
  const path = usePathname(); const router = useRouter();
  if (path === "/") return null;
  return <button type="button" className="back-btn" aria-label="Назад" onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}><ArrowLeft size={20} /></button>;
}
