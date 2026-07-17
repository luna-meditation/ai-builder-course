import { LockKeyhole } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center px-5"><div className="card max-w-md p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/[.05]"><LockKeyhole className="size-6 text-[var(--muted)]" /></div><h1 className="mt-5 text-2xl font-bold">Урок пока недоступен</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Пройдите предыдущий шаг или дождитесь проверки задания — доступ проверяется на сервере.</p><ButtonLink href="/course" className="mt-6">Вернуться к курсу</ButtonLink></div></main>;
}
