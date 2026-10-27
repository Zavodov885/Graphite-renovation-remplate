"use client";
import { useState } from "react";
export function PasswordInput({ name, autoComplete, minLength }: { name: string; autoComplete: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (<div className="pw">
    <input className="input" type={show ? "text" : "password"} name={name} required minLength={minLength} autoComplete={autoComplete} />
    <button type="button" className="pw-btn" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Скрыть пароль" : "Показать пароль"}>{show ? "Скрыть" : "Показать"}</button>
  </div>);
}
