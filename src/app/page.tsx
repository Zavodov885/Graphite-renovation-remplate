import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, homePath } from "@/lib/auth";
import { Calculator, type SvcView } from "@/components/Calculator";
import { InstallHint } from "@/components/InstallHint";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { UNIT_FOR } from "@/lib/format";
import { telLink } from "@/lib/contacts";
import type { Unit } from "@/lib/pricing";

export const dynamic = "force-dynamic"; // прайс всегда актуален

export default async function Home() {
  const sb = await createClient();
  const p = await getProfile();
  const applyHref = p?.role === "client" ? "/cabinet/new" : p ? homePath(p.role) : "/register";
  const { data, error } = await sb.from("services").select("id,name,slug,unit,base_price,price_note,service_categories(name,sort)").eq("is_published", true).eq("is_archived", false);
  const rows = (data ?? []).map((s) => {
    const c = Array.isArray(s.service_categories) ? s.service_categories[0] : s.service_categories;
    return { id: s.id as string, name: s.name as string, slug: s.slug as string, unit: s.unit as Unit, price: Number(s.base_price), note: (s.price_note as string | null) ?? null, category: (c?.name as string | undefined) ?? "Прочее" };
  }).sort((a, b) => a.category.localeCompare(b.category, "ru") || a.name.localeCompare(b.name, "ru"));
  const services: SvcView[] = rows;
  const { data: co } = await sb.from("company_settings").select("name,phone,email,address,work_hours").eq("id", 1).maybeSingle();
  const steps = [["Заявка", "Описываете задачу и прикладываете фото."], ["Смета", "Менеджер уточняет объём и присылает смету на согласование."], ["Работы", "Мастер выкладывает фотоотчёты по этапам."], ["Приёмка", "Вы принимаете результат и оставляете отзыв."]];

  return (<main className="wrap">
    <div className="home-hero">
      <div>
        <InstallHint />
        <section style={{ padding: "16px 0 8px" }}><h1>Ремонт квартир с понятной сметой</h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: "46ch" }}>Посчитайте стоимость по прайсу, отправьте заявку и следите за ходом работ в личном кабинете.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn" href="#calc">Рассчитать стоимость</a><LinkButton href={applyHref} variant="ghost">Оставить заявку</LinkButton></div></section>
      </div>
      <div className="calc-col">{error ? <ErrorState message="Не удалось загрузить прайс. Обновите страницу." /> : !services.length ? <EmptyState title="Прайс-лист пока пуст" hint="Услуги появятся после добавления в панели." /> : <Calculator services={services} />}</div>
    </div>

    <section style={{ padding: "16px 0" }}><h2>Как это выглядит</h2><p className="muted">Выберите вид работ и посмотрите фото: до, в процессе и после. Регистрация не нужна.</p>
      <div className="chips-grid">{rows.map((s) => <Link key={s.id} href={`/gallery?service=${s.slug}`} className="btn ghost sm">{s.name}</Link>)}<Link href="/gallery" className="btn sm">Все фото</Link></div></section>

    <section id="price" style={{ padding: "16px 0" }}><h2>Прайс-лист</h2>
      {rows.length ? <div>{rows.map((s, i) => (<div key={s.id}>{(i === 0 || rows[i - 1]?.category !== s.category) && <div className="price-cat">{s.category}</div>}
        <div className="price-row"><div><b>{s.name}</b><div className="muted">{UNIT_FOR[s.unit]}</div>{s.note && <div className="muted small">{s.note}</div>}</div><b className="price">{s.price.toLocaleString("ru-RU")} ₽</b></div></div>))}</div> : <p className="muted">Прайс-лист пока пуст.</p>}</section>

    <section id="steps" style={{ padding: "16px 0" }}><h2>Как проходит работа</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>{steps.map(([t, d]) => <div className="card" key={t} style={{ marginBottom: 0 }}><b>{t}</b><p className="muted" style={{ marginBottom: 0 }}>{d}</p></div>)}</div></section>

    <section id="contacts" style={{ padding: "16px 0" }}><h2>Контакты</h2><div className="card">{co && (co.phone || co.email || co.address || co.work_hours) ? (<>
      {co.name && <b>{co.name}</b>}{co.phone && <p>Телефон: {telLink(co.phone) ? <a href={telLink(co.phone)!} style={{ color: "var(--accent)" }}>{co.phone}</a> : co.phone}</p>}
      {co.email && <p>Email: {co.email}</p>}{co.address && <p>Адрес: {co.address}</p>}{co.work_hours && <p>Часы работы: {co.work_hours}</p>}</>) : <p className="muted" style={{ margin: 0 }}>Контакты компании будут добавлены администратором.</p>}</div></section>

    <footer className="muted" style={{ padding: "16px 0 24px", borderTop: "1px solid var(--border)" }}>
      <div className="footer-links"><Link href="/gallery" style={{ color: "var(--accent)" }}>Фото работ</Link><Link href="/privacy" style={{ color: "var(--accent)" }}>Политика обработки данных</Link><Link href="/consent" style={{ color: "var(--accent)" }}>Согласие на обработку данных</Link><Link href="/install" style={{ color: "var(--accent)" }}>Установить на телефон</Link></div>
      Цены и тексты демонстрационные. Юридические документы требуют проверки юристом.</footer>
  </main>);
}
