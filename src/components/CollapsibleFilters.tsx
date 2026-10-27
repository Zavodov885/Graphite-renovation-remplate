"use client";
import { useState } from "react";
// На телефоне фильтры сворачиваются, на компьютере всегда видны.
export function CollapsibleFilters({ children, active }: { children: React.ReactNode; active: number }) {
  const [open, setOpen] = useState(active > 0);
  return (<div className="filters"><button type="button" className="btn ghost sm filters-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>Фильтры{active ? ` (${active})` : ""} {open ? "▲" : "▼"}</button>
    <div className={`filters-body ${open ? "" : "closed"}`}>{children}</div></div>);
}
