import type { Metadata } from "next";
import { CourseDashboard } from "@/components/course-dashboard";
import { NoAccess } from "@/components/no-access";
import { requireSession } from "@/lib/auth/session";
import { getStudentMode } from "@/lib/auth/access";
import { getCourseDashboard } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Мой курс" };

export default async function CoursePage() {
  const session = await requireSession();
  const result = await getCourseDashboard(session);
  if (!result.access) return <NoAccess firstName={result.profile.first_name} supportUsername={result.supportUsername} accessStatus={result.accessStatus} justRegistered={Boolean(session.isNewUser)} />;
  return <CourseDashboard data={result.dashboard} mode={getStudentMode(session)} />;
}
