import { LinkButton } from "@/components/ui/Button";
export default function NotFound() {
  return (<main className="wrap"><div className="center card"><h2>Страница не найдена</h2><p className="muted">Проверьте адрес или вернитесь на главную.</p><LinkButton href="/">На главную</LinkButton></div></main>);
}
