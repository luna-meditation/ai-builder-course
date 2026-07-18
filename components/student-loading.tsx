import { Logo } from "@/components/ui/logo";

export function StudentLoading({ compact = false }: { compact?: boolean }) {
  return <main className="student-shell safe-top pb-28" aria-label="Загружаем раздел">
    <header className="flex items-center justify-between py-4"><Logo /><div className="skeleton h-10 w-24 rounded-2xl" /></header>
    <section className="premium-panel mt-4 p-5 sm:p-8">
      <div className="skeleton h-3 w-28 rounded-full" />
      <div className="skeleton mt-5 h-10 w-[82%] rounded-xl sm:h-12" />
      <div className="skeleton mt-3 h-4 w-[66%] rounded-full" />
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="skeleton h-20 rounded-2xl" />)}</div>
    </section>
    {!compact && <div className="mt-5 grid gap-3">{[0, 1, 2].map((item) => <div key={item} className="card flex gap-4 p-4"><div className="skeleton size-14 shrink-0 rounded-[18px]" /><div className="flex-1"><div className="skeleton h-3 w-24 rounded-full" /><div className="skeleton mt-3 h-5 w-[68%] rounded-lg" /><div className="skeleton mt-3 h-3 w-full rounded-full" /></div></div>)}</div>}
  </main>;
}
