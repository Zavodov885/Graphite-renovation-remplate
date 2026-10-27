"use client";
import { useEffect } from "react";
// Для мобильной версии: подписывает ячейки таблиц названиями колонок (CSS показывает их в карточках).
export function TableLabels() {
  useEffect(() => {
    const label = () => document.querySelectorAll("table").forEach((t) => {
      const heads = Array.from(t.querySelectorAll("thead th")).map((h) => h.textContent?.trim() ?? "");
      if (!heads.length) return;
      t.querySelectorAll("tbody tr").forEach((tr) => {
        let col = 0;
        Array.from(tr.children).forEach((td) => { const el = td as HTMLElement; if (el.dataset.label === undefined) el.dataset.label = heads[col] ?? ""; col += Number(el.getAttribute("colspan") || 1); });
      });
    });
    label();
    let raf = 0;
    const obs = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(label); });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
