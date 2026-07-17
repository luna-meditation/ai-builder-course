import { Bell } from "lucide-react";

export function AdminHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-[-.035em] sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>}</div><div className="flex items-center gap-2">{action}<button className="focus-ring grid size-11 place-items-center rounded-xl border border-[var(--border)] bg-white/[.035] text-[var(--muted)]" title="Уведомления"><Bell className="size-4" /></button></div></header>;
}
