"use client";
import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type FormState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PasswordInput } from "@/components/PasswordInput";

const init: FormState = {};
const Msg = ({ s }: { s: FormState }) => (<>{s.error && <p className="err" role="alert">⚠ {s.error}</p>}{s.info && <p role="status" style={{ color: "var(--success)" }}>✓ {s.info}</p>}</>);

export function LoginForm({ next }: { next?: string }) {
  const [s, action] = useActionState(signIn, init);
  return (<form action={action} className="card" style={{ maxWidth: 420, margin: "10vh auto" }}>
    <h2>Вход</h2><input type="hidden" name="next" value={next ?? ""} />
    <label className="field">Email<input className="input" type="email" name="email" required autoComplete="username" /></label>
    <label className="field">Пароль<PasswordInput name="password" autoComplete="current-password" /></label>
    <Msg s={s} /><SubmitButton>Войти</SubmitButton>
    <p className="muted">Нет аккаунта? <Link href="/register" style={{ color: "var(--accent)" }}>Регистрация</Link></p>
  </form>);
}

export function RegisterForm() {
  const [s, action] = useActionState(signUp, init);
  return (<form action={action} className="card" style={{ maxWidth: 420, margin: "8vh auto" }}>
    <h2>Регистрация клиента</h2>
    <label className="field">Имя<input className="input" name="full_name" required minLength={2} autoComplete="name" /></label>
    <label className="field">Email<input className="input" type="email" name="email" required autoComplete="email" /></label>
    <label className="field">Пароль (от 8 символов)<PasswordInput name="password" minLength={8} autoComplete="new-password" /></label>
    <label className="field" style={{ display: "flex", gap: 10 }}><input type="checkbox" name="consent" required style={{ marginTop: 4 }} /><span>Согласен на <a href="/consent" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>обработку персональных данных</a> и принимаю <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>политику</a></span></label>
    <Msg s={s} /><SubmitButton>Создать аккаунт</SubmitButton>
    <p className="muted">Публичная регистрация создаёт только клиента. Роли сотрудников назначает администратор.</p>
    <p className="muted">Уже есть аккаунт? <Link href="/login" style={{ color: "var(--accent)" }}>Войти</Link></p>
  </form>);
}
