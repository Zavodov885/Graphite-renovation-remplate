// Зеркало SQL-функции transition_allowed. БД остаётся источником истины.
export type Role = "client" | "master" | "manager" | "admin";
export type Status = "new" | "under_review" | "awaiting_approval" | "master_assigned" | "in_progress" | "awaiting_extra_work_approval" | "completed" | "cancelled";
export const STATUS_LABEL: Record<Status, string> = {
  new: "Новая", under_review: "На рассмотрении", awaiting_approval: "Ожидает согласования", master_assigned: "Мастер назначен",
  in_progress: "В работе", awaiting_extra_work_approval: "Ожидает решения по доп. работам", completed: "Завершена", cancelled: "Отменена" };
const staff: Record<string, Status[]> = {
  new: ["under_review", "cancelled"], under_review: ["awaiting_approval", "master_assigned", "cancelled"],
  awaiting_approval: ["under_review", "master_assigned", "cancelled"], master_assigned: ["in_progress", "cancelled"],
  in_progress: ["awaiting_extra_work_approval", "completed", "cancelled"], awaiting_extra_work_approval: ["in_progress", "cancelled"] };
const master: Record<string, Status[]> = { master_assigned: ["in_progress"], in_progress: ["awaiting_extra_work_approval"] };
const client: Record<string, Status[]> = { new: ["cancelled"], awaiting_extra_work_approval: ["in_progress"] };
export function canTransition(from: Status, to: Status, role: Role) {
  const m = role === "manager" || role === "admin" ? staff : role === "master" ? master : client;
  return (m[from] ?? []).includes(to);
}
