import type { SessionUser } from "@/lib/types";

export function canAccessAdminSurface(session: SessionUser) {
  return session.role === "admin" && !session.previewAsStudent;
}

export function canEnterStudentPreview(session: SessionUser) {
  return session.role === "admin";
}

export function canMutateWhilePreviewing(session: SessionUser) {
  return !session.previewAsStudent;
}

export function isBootstrapAdminTelegramId(telegramUserId: string, adminTelegramIds: ReadonlySet<string>) {
  return adminTelegramIds.has(telegramUserId);
}
