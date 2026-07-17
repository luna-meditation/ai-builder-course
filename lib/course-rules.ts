import type { ProgressStatus, UnlockRule } from "@/lib/types";

export function canAccessCourse(input: {
  hasEnrollment: boolean;
  enrollmentStatus?: "active" | "revoked" | "completed";
  isBlocked: boolean;
}) {
  return input.hasEnrollment && input.enrollmentStatus !== "revoked" && !input.isBlocked;
}

export function canOpenLesson(input: {
  isBlocked: boolean;
  hasActiveEnrollment: boolean;
  isPublished: boolean;
  progressStatus: ProgressStatus | null;
}) {
  return (
    !input.isBlocked &&
    input.hasActiveEnrollment &&
    input.isPublished &&
    input.progressStatus !== null &&
    input.progressStatus !== "locked"
  );
}

export function shouldUnlockNextLesson(rule: UnlockRule, event: "submitted" | "approved" | "manual") {
  if (rule === "none") return false;
  if (rule === "after_submission") return event === "submitted" || event === "approved";
  if (rule === "after_approval") return event === "approved";
  return rule === "manual" && event === "manual";
}

export function statusLabel(status: ProgressStatus) {
  const labels: Record<ProgressStatus, string> = {
    locked: "Заблокирован",
    available: "Доступен",
    in_progress: "В процессе",
    submitted: "Задание отправлено",
    in_review: "На проверке",
    revision_requested: "Требуется доработка",
    completed: "Выполнен",
  };
  return labels[status];
}

export function canReadSubmission(input: { viewerId: string; ownerId: string; viewerRole: "student" | "admin" | "mentor" }) {
  return input.viewerRole === "admin" || input.viewerId === input.ownerId;
}

export function canReviewSubmission(input: { role: "student" | "admin" | "mentor"; isBlocked: boolean; action: "approve" | "revision"; comment?: string }) {
  if (input.role !== "admin" || input.isBlocked) return false;
  return input.action !== "revision" || Boolean(input.comment?.trim());
}

export function notificationIdempotencyKey(type: string, entityId: string, version?: string) {
  return [type, entityId, version].filter(Boolean).join(":");
}
