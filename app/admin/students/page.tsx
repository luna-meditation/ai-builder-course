import { AdminHeader } from "@/components/admin/admin-header";
import { StudentsTable } from "@/components/admin/students-table";
import { requireSession } from "@/lib/auth/session";
import { getAdminStudents } from "@/lib/data";

export default async function StudentsPage() {
  const session = await requireSession("admin"); const data = await getAdminStudents(session);
  return <><AdminHeader eyebrow="Управление доступом" title="Ученики" description="Выдавайте доступ, отслеживайте прогресс и открывайте полную историю каждого ученика." /><StudentsTable rows={data.rows} courseId={data.courses[0]?.id} /></>;
}
