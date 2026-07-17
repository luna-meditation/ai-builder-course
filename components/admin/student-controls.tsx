"use client";

import { LockKeyhole, Shield, UnlockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Lesson, LessonProgress, Role } from "@/lib/types";

export function StudentRoleControl({ profileId, role }: { profileId: string; role: Role }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function change(nextRole: Role) { if (!window.confirm(`Изменить роль на ${nextRole}?`)) return; setBusy(true); try { const response = await fetch(`/api/admin/profiles/${profileId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success("Роль изменена"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); } finally { setBusy(false); } }
  return <label className="flex items-center gap-2 text-xs text-[var(--muted)]"><Shield className="size-4" /><select value={role} disabled={busy} onChange={(event) => void change(event.target.value as Role)} className="focus-ring h-9 rounded-lg border border-[var(--border)] bg-[#15171e] px-2 text-xs text-white"><option value="student">student</option><option value="mentor">mentor</option><option value="admin">admin</option></select></label>;
}

export function LessonAccessControl({ enrollmentId, lesson }: { enrollmentId: string; lesson: Lesson & { progress: LessonProgress | null } }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const locked = !lesson.progress || lesson.progress.status === "locked";
  async function update() { setBusy(true); try { const response = await fetch("/api/admin/progress", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enrollmentId, lessonId: lesson.id, action: locked ? "unlock" : "lock" }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); toast.success(locked ? "Урок открыт" : "Урок заблокирован"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Ошибка"); } finally { setBusy(false); } }
  return <Button variant="ghost" loading={busy} onClick={() => void update()} className="min-h-9 px-3">{locked ? <UnlockKeyhole className="size-3.5" /> : <LockKeyhole className="size-3.5" />}{locked ? "Открыть" : "Закрыть"}</Button>;
}
