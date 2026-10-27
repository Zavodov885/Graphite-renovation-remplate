"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calcAction, type CalcResult } from "@/app/actions/calc";
import { rub, UNIT_LABEL } from "@/lib/format";
import type { Unit } from "@/lib/pricing";

export interface SvcView { id: string; name: string; unit: Unit; price: number; note: string | null; category: string }

export function Calculator({ services }: { services: SvcView[] }) {
  const [sel, setSel] = useState<Record<string, { on: boolean; q: string }>>({});
  const [res, setRes] = useState<CalcResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [last, setLast] = useState<{ id: string; quantity: number }[]>([]);
  const chosen = services.filter((s) => sel[s.id]?.on);
  const toggle = (id: string, on: boolean) => { setSel((p) => ({ ...p, [id]: { q: p[id]?.q ?? "10", on } })); setRes(null); };
  const setQ = (id: string, q: string) => { setSel((p) => ({ ...p, [id]: { on: p[id]?.on ?? true, q } })); setRes(null); };
  const run = () => start(async () => {
    const items = chosen.map((s) => ({ id: s.id, quantity: s.unit === "fixed" ? 1 : Number((sel[s.id]?.q ?? "0").replace(",", ".")) }));
    setLast(items);
    setRes(await calcAction(items));
  });

  const cats = [...new Set(services.map((s) => s.category))];
  return (<div className="card" id="calc"><h3>Калькулятор стоимости</h3>
    <p className="muted">Цены берутся из актуального прайс-листа. Расчёт предварительный: итоговая смета уточняется после осмотра объекта.</p>
    {cats.map((c) => (<div key={c}><div className="muted" style={{ marginTop: 12 }}>{c}</div>
      {services.filter((s) => s.category === c).map((s) => (
        <div key={s.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--border)" }}>
          <input type="checkbox" checked={!!sel[s.id]?.on} onChange={(e) => toggle(s.id, e.target.checked)} aria-label={s.name} style={{ width: 20, height: 20, accentColor: "var(--accent)" }} />
          <span>{s.name}<br /><span className="muted">{s.price.toLocaleString("ru-RU")} ₽ / {UNIT_LABEL[s.unit]}</span></span>
          {s.unit === "fixed" ? <span className="muted">1 шт.</span> :
            <input className="input" style={{ width: 90, textAlign: "right" }} type="number" min="0" step="any" inputMode="decimal" value={sel[s.id]?.q ?? "10"} onChange={(e) => setQ(s.id, e.target.value)} aria-label={`Количество, ${UNIT_LABEL[s.unit]}`} />}
        </div>))}</div>))}
    <button className="btn" style={{ width: "100%", marginTop: 14 }} onClick={run} disabled={!chosen.length || pending} aria-busy={pending}>{pending ? "Считаем…" : "Рассчитать"}</button>
    {res && !res.ok && <p className="err" role="alert">⚠ {res.error}</p>}
    {res?.ok && (<div role="status" style={{ marginTop: 14 }}><div className="table-wrap"><table><thead><tr><th>Услуга</th><th>Кол-во</th><th>Сумма</th></tr></thead><tbody>
      {res.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.quantity} {UNIT_LABEL[l.unit]}</td><td>{rub(l.totalCents)}</td></tr>)}</tbody></table></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}><span className="muted">Предварительно</span><b style={{ fontSize: 28, color: "var(--accent)" }}>{rub(res.totalCents)}</b></div>
      <button className="btn ghost" style={{ width: "100%", marginTop: 10 }} onClick={() => { sessionStorage.setItem("calc", JSON.stringify(last)); router.push("/cabinet/new"); }}>Перенести в заявку</button></div>)}
  </div>);
}
