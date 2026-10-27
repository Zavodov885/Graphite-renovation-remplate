import { LinkButton } from "@/components/ui/Button";
export const metadata = { title: "Установка на телефон" };
const Block = ({ t, steps }: { t: string; steps: string[] }) => (<div className="card"><h3>{t}</h3><ol className="muted" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>{steps.map((s) => <li key={s}>{s}</li>)}</ol></div>);

export default function Install() {
  return (<main className="wrap" style={{ padding: "24px 20px", maxWidth: 720 }}>
    <h1 style={{ fontSize: 32 }}>Установка на главный экран</h1>
    <p className="muted">Сайт можно добавить на экран телефона, и он будет открываться как приложение, без адресной строки. Способ зависит от устройства и браузера.</p>
    <Block t="iPhone и iPad (Safari)" steps={["Откройте сайт в Safari (в других браузерах пункта может не быть).", "Нажмите кнопку «Поделиться» (квадрат со стрелкой).", "Выберите «На экран “Домой”».", "Нажмите «Добавить»."]} />
    <Block t="Android (Chrome)" steps={["Откройте сайт в Chrome.", "Нажмите меню ⋮ в правом верхнем углу.", "Выберите «Установить приложение» или «Добавить на главный экран».", "Подтвердите установку."]} />
    <Block t="Компьютер (Chrome, Edge)" steps={["Откройте сайт.", "Нажмите значок установки в правой части адресной строки.", "Подтвердите установку."]} />
    <p className="muted">Установка работает только на защищённом адресе (https). Для работы нужен интернет: офлайн-режима нет.</p>
    <LinkButton href="/" variant="ghost">На главную</LinkButton>
  </main>);
}
