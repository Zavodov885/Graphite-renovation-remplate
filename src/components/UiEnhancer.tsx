"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 1) Показывает «Сохранено» после успешных действий (?ok=1) и убирает параметр из адреса.
// 2) Блокирует кнопки формы на время отправки (защита от двойного нажатия).
export function UiEnhancer() {
  const path = usePathname(); const sp = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    document.querySelectorAll("form[data-busy]").forEach((f) => f.removeAttribute("data-busy"));
    if (sp.get("ok")) {
      setToast("Сохранено");
      const u = new URL(window.location.href); u.searchParams.delete("ok");
      window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  }, [path, sp]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);
  useEffect(() => {
    const h = (e: Event) => {
      const f = e.target;
      if (!(f instanceof HTMLFormElement) || f.method === "get" || f.hasAttribute("data-no-busy")) return;
      setTimeout(() => { f.setAttribute("data-busy", "1"); setTimeout(() => f.removeAttribute("data-busy"), 8000); }, 0);
    };
    document.addEventListener("submit", h, true);
    return () => document.removeEventListener("submit", h, true);
  }, []);
  return toast ? <div className="toast" role="status">✓ {toast}</div> : null;
}
