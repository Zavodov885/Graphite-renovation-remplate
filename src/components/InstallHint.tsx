"use client";
import { useEffect, useState } from "react";
type BIP = Event & { prompt: () => Promise<void> };

// Подсказка «добавить на главный экран»: учитывает iPhone/Android, не показывается в уже установленном приложении.
export function InstallHint() {
  const [state, setState] = useState<{ kind: "ios-safari" | "ios-other" | "android" | "other" } | null>(null);
  const [evt, setEvt] = useState<BIP | null>(null);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    let dismissed = false;
    try { dismissed = localStorage.getItem("install-hint") === "1"; } catch { /* хранилище недоступно */ }
    if (standalone || dismissed) return;
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/.test(ua);
    const safari = ios && !/CriOS|FxiOS|YaBrowser|EdgiOS|OPiOS/.test(ua);
    setState({ kind: ios ? (safari ? "ios-safari" : "ios-other") : /Android/.test(ua) ? "android" : "other" });
    const h = (e: Event) => { e.preventDefault(); setEvt(e as BIP); };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  if (!state) return null;
  const close = () => { try { localStorage.setItem("install-hint", "1"); } catch { /* ignore */ } setState(null); };
  const text = state.kind === "ios-safari" ? "Нажмите «Поделиться» (квадрат со стрелкой) → «На экран “Домой”»."
    : state.kind === "ios-other" ? "Откройте этот сайт в Safari: в других браузерах на iPhone пункта «На экран “Домой”» может не быть."
    : state.kind === "android" ? "Нажмите меню ⋮ в браузере → «Установить приложение» или «Добавить на главный экран»." : "В Chrome или Edge нажмите значок установки в адресной строке.";
  return (<div className="card" role="note" style={{ margin: "12px 0", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
    <div style={{ flex: 1, minWidth: 220 }}><b>Установите на телефон</b><div className="muted">{text}</div></div>
    {evt && <button className="btn sm" onClick={async () => { await evt.prompt(); setEvt(null); }}>Установить</button>}
    <button className="btn ghost sm" onClick={close} aria-label="Закрыть подсказку">Скрыть</button></div>);
}
