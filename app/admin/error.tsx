"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="card mx-auto max-w-xl p-7 text-center sm:p-10"><AlertTriangle className="mx-auto size-8 text-[var(--warning)]" /><h1 className="mt-4 text-xl font-bold">Раздел не загрузился</h1><p className="mt-2 text-sm leading-6 text-[var(--muted)]">Проверьте соединение и повторите попытку. Несохранённые данные в формах не отправлялись.</p><Button onClick={reset} className="mt-6"><RotateCcw className="size-4" /> Повторить</Button></section>;
}
