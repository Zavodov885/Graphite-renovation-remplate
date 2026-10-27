import Link from "next/link";
import { getProfile, homePath } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { LinkButton } from "@/components/ui/Button";
import { BackButton } from "@/components/BackButton";

const ROLE_RU = { client: "Клиент", master: "Мастер", manager: "Менеджер", admin: "Администратор" } as const;

export async function Header() {
  const p = await getProfile();
  return (
    <header className="topbar"><div className="wrap">
      <BackButton />
      <Link href="/" className="logo"><i /><span className="logo-text">{process.env.NEXT_PUBLIC_APP_NAME ?? "Graphite Renovation"}</span></Link>
      <nav className="topnav" aria-label="Разделы сайта"><Link href="/#calc">Калькулятор</Link><Link href="/#price">Прайс</Link><Link href="/gallery">Фото работ</Link><Link href="/#steps">Как работаем</Link><Link href="/#contacts">Контакты</Link></nav>
      <div className="spacer">
        {p ? (<>
          <span className="muted hide-sm">{p.full_name || "Профиль"}</span><span className="chip">{ROLE_RU[p.role]}</span>
          <LinkButton href={homePath(p.role)} variant="ghost" sm>Кабинет</LinkButton>
          <form action={signOut}><button className="btn ghost sm">Выйти</button></form>
        </>) : (<><LinkButton href="/login" variant="ghost">Войти</LinkButton><LinkButton href="/register">Регистрация</LinkButton></>)}
      </div>
    </div></header>
  );
}
