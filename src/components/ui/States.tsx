import { LinkButton } from "./Button";
export const EmptyState = ({ title, hint, href, action }: { title: string; hint?: string; href?: string; action?: string }) => (
  <div className="card" role="status"><h3>{title}</h3>{hint && <p className="muted">{hint}</p>}{href && action && <LinkButton href={href}>{action}</LinkButton>}</div>);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="card" role="alert"><h3>Что-то пошло не так</h3><p className="muted">{message}</p>{onRetry && <button className="btn ghost" onClick={onRetry}>Повторить</button>}</div>);
export const LoadingState = ({ label = "Загрузка…" }: { label?: string }) => <p className="muted" role="status" aria-live="polite">{label}</p>;
