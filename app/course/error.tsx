"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center px-5"><div className="card max-w-md p-7 text-center"><AlertTriangle className="mx-auto size-8 text-[var(--warning)]" /><h1 className="mt-5 text-2xl font-bold">Не удалось загрузить курс</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Проверьте соединение и попробуйте ещё раз. Введённые черновики сохраняются отдельно.</p><Button className="mt-6" onClick={reset}><RefreshCw className="size-4" /> Повторить</Button></div></main>;
}
