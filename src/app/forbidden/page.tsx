import { LinkButton } from "@/components/ui/Button";
export const metadata = { title: "Нет доступа" };
export default function Forbidden() {
  return (<main className="wrap"><div className="center card"><h2>Нет доступа</h2><p className="muted">У вашей роли нет прав на эту страницу.</p><LinkButton href="/">На главную</LinkButton></div></main>);
}
