import { CircleCheck, Clock3, LockKeyhole, Play, RotateCcw } from "lucide-react";
import type { ProgressStatus, SubmissionStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Status = ProgressStatus | SubmissionStatus;
const config: Record<Status, { label: string; className: string; icon: typeof CircleCheck }> = {
  locked: { label: "Заблокирован", className: "bg-white/[.05] text-[var(--muted)]", icon: LockKeyhole },
  available: { label: "Текущий", className: "bg-[#7667ff]/15 text-[#b9b1ff]", icon: Play },
  in_progress: { label: "Текущий", className: "bg-[#5f8cff]/15 text-[#91b0ff]", icon: Play },
  draft: { label: "Черновик", className: "bg-white/[.06] text-[var(--muted)]", icon: Clock3 },
  submitted: { label: "Отправлено", className: "bg-[var(--warning)]/15 text-[#ffc879]", icon: Clock3 },
  in_review: { label: "На проверке", className: "bg-[var(--warning)]/15 text-[#ffc879]", icon: Clock3 },
  revision_requested: { label: "Нужна доработка", className: "bg-[var(--danger)]/15 text-[#ff8da0]", icon: RotateCcw },
  approved: { label: "Принято", className: "bg-[var(--success)]/15 text-[#69e2b3]", icon: CircleCheck },
  completed: { label: "Выполнено", className: "bg-[var(--success)]/15 text-[#69e2b3]", icon: CircleCheck },
};

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  const item = config[status]; const Icon = item.icon;
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/[.045] px-2.5 py-1.5 text-[10px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,.025)]", item.className, className)}><Icon className="size-3.5" />{item.label}</span>;
}
