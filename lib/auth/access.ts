import type { SessionUser } from "@/lib/types";

export function getStudentMode(session: SessionUser) {
  if (session.studentMode) return session.studentMode;
  return session.previewAsStudent ? "preview" as const : null;
}

export function canAccessAdminSurface(session: SessionUser) {
  return session.role === "admin" && getStudentMode(session) === null;
}

export function canEnterStudentPreview(session: SessionUser) {
  return session.role === "admin";
}

export function canMutateWhilePreviewing(session: SessionUser) {
  return getStudentMode(session) !== "preview";
}

export function isReadOnlyStudentPreview(session: SessionUser) {
  return session.role === "admin" && getStudentMode(session) === "preview";
}

export function isAdminLearningAsStudent(session: SessionUser) {
  return session.role === "admin" && getStudentMode(session) === "learning";
}

export function isBootstrapAdminTelegramId(telegramUserId: string, adminTelegramIds: ReadonlySet<string>) {
  return adminTelegramIds.has(telegramUserId);
}
