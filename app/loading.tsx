import { Logo } from "@/components/ui/logo";

export default function Loading() {
  return <main className="student-shell safe-top pb-16" aria-label="Загружаем курс">
    <header className="flex items-center justify-between py-4"><Logo /><div className="skeleton h-10 w-28 rounded-2xl" /></header>
    <section className="premium-panel mt-4 p-5 sm:p-8">
      <div className="skeleton h-3 w-28 rounded-full" />
      <div className="skeleton mt-5 h-10 w-[88%] rounded-xl sm:h-12" />
      <div className="skeleton mt-3 h-10 w-[64%] rounded-xl sm:h-12" />
      <div className="skeleton mt-6 h-4 w-full rounded-full" />
      <div className="skeleton mt-2 h-4 w-[72%] rounded-full" />
      <div className="skeleton mt-7 h-12 w-52 rounded-2xl" />
    </section>
    <section className="premium-panel mt-4 flex items-center gap-5 p-5"><div className="skeleton size-28 shrink-0 rounded-full" /><div className="flex-1"><div className="skeleton h-4 w-24 rounded-full" /><div className="skeleton mt-3 h-7 w-[70%] rounded-lg" /><div className="skeleton mt-4 h-2 w-full rounded-full" /></div></section>
    <div className="mt-8 grid gap-3">{[0, 1, 2].map((item) => <div key={item} className="card flex gap-4 p-4"><div className="skeleton size-14 shrink-0 rounded-[18px]" /><div className="flex-1"><div className="skeleton h-3 w-24 rounded-full" /><div className="skeleton mt-3 h-5 w-[68%] rounded-lg" /><div className="skeleton mt-3 h-3 w-full rounded-full" /></div></div>)}</div>
  </main>;
}
