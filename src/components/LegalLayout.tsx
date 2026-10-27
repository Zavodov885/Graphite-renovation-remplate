import { CONSENT_VERSION } from "@/lib/validation/auth";
import { LinkButton } from "@/components/ui/Button";

export const Missing = ({ what }: { what: string }) => <mark style={{ background: "color-mix(in srgb,var(--warning) 25%,transparent)", color: "var(--warning)", padding: "0 4px", borderRadius: 4 }}>[укажите: {what}]</mark>;

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (<main className="wrap" style={{ padding: "24px 20px 48px", maxWidth: 780 }}>
    <h1 style={{ fontSize: 30 }}>{title}</h1>
    <div className="card" role="note" style={{ borderColor: "var(--warning)" }}><b style={{ color: "var(--warning)" }}>Черновик, требует проверки юристом.</b>
      <p className="muted" style={{ margin: "6px 0 0" }}>Документ подготовлен как шаблон и не является проверенным юридическим текстом. До публикации его должен проверить юрист с учётом вашей деятельности. Версия редакции: {CONSENT_VERSION}.</p></div>
    <div style={{ lineHeight: 1.7 }}>{children}</div>
    <div style={{ marginTop: 24 }}><LinkButton href="/" variant="ghost">На главную</LinkButton></div>
  </main>);
}
