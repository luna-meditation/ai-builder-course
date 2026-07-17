import { AdminHeader } from "@/components/admin/admin-header";
import { CourseEditor } from "@/components/admin/course-editor";
import { requireSession } from "@/lib/auth/session";
import { getCourseEditorData } from "@/lib/data";

export default async function CourseEditorPage() {
  const session = await requireSession("admin"); const data = await getCourseEditorData(session);
  return <><AdminHeader eyebrow="Контент" title="Редактор курса" description="Изменения сохраняются в базе и сразу используются ученической частью платформы." /><CourseEditor course={data.course} lessons={data.lessons} /></>;
}
