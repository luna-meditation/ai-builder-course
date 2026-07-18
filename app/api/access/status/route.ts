import { NextResponse } from "next/server";
import { bootstrapDestination, hasCourseAccess } from "@/lib/auth/bootstrap";
import { getSession } from "@/lib/auth/session";
import { DataError, getStudentAccessStatus } from "@/lib/data";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });

  try {
    const result = await getStudentAccessStatus(session);
    return NextResponse.json({
      accessStatus: result.accessStatus,
      hasAccess: hasCourseAccess(result.accessStatus),
      destination: bootstrapDestination(result.profile.role, result.accessStatus),
    });
  } catch (error) {
    const status = error instanceof DataError && error.code === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: status === 403 ? "Сессия больше не действительна" : "Не удалось проверить доступ" }, { status });
  }
}
