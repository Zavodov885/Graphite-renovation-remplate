"use client";
import { useEffect, useState } from "react";
// Быстрые переходы по разделам длинной карточки заявки (показываются только существующие разделы).
export function DetailNav({ items }: { items: { id: string; label: string }[] }) {
  const [shown, setShown] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => { setShown(items.filter((i) => document.getElementById(i.id))); }, [items]);
  if (!shown.length) return null;
  return <nav className="detail-nav" aria-label="Разделы заявки">{shown.map((i) => <a key={i.id} href={`#${i.id}`} className="btn ghost sm">{i.label}</a>)}</nav>;
}
