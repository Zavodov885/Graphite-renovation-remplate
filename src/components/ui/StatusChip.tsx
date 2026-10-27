import { STATUS_LABEL, type Status } from "@/lib/status";
const COLOR: Record<Status, string> = { new: "--accent", under_review: "--warning", awaiting_approval: "--warning", master_assigned: "--accent", in_progress: "--success", awaiting_extra_work_approval: "--danger", completed: "--success", cancelled: "--text-2" };
export function StatusChip({ status }: { status: Status }) {
  return <span className="chip" style={{ ["--c" as string]: `var(${COLOR[status]})` }}>{STATUS_LABEL[status]}</span>;
}
