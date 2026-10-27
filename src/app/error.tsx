"use client";
import { ErrorState } from "@/components/ui/States";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  // Технические детали не показываем пользователю; полная ошибка остаётся в серверных логах.
  return <main className="wrap"><ErrorState message="Не удалось загрузить страницу. Проверьте соединение и попробуйте ещё раз." onRetry={reset} /></main>;
}
