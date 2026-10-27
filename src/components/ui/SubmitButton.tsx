"use client";
import { useFormStatus } from "react-dom";
// Блокируется на время отправки: защита от двойного нажатия.
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="btn" style={{ width: "100%" }} disabled={pending} aria-busy={pending}>{pending ? "Подождите…" : children}</button>;
}
