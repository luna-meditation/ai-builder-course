import { describe, expect, it } from "vitest";
import { canAccessCourse, canOpenLesson, canReadSubmission, canReviewSubmission, notificationIdempotencyKey, shouldUnlockNextLesson } from "@/lib/course-rules";

describe("доступ к курсу и урокам", () => {
  it("пользователь без записи не видит курс", () => {
    expect(canAccessCourse({ hasEnrollment: false, isBlocked: false })).toBe(false);
  });

  it("ученик не может открыть заблокированный урок по прямой ссылке", () => {
    expect(canOpenLesson({ isBlocked: false, hasActiveEnrollment: true, isPublished: true, progressStatus: "locked" })).toBe(false);
  });

  it("заблокированный пользователь не получает доступ", () => {
    expect(canAccessCourse({ hasEnrollment: true, enrollmentStatus: "active", isBlocked: true })).toBe(false);
    expect(canOpenLesson({ isBlocked: true, hasActiveEnrollment: true, isPublished: true, progressStatus: "available" })).toBe(false);
  });
});

describe("правила открытия следующего урока", () => {
  it("after_submission открывает следующий урок после отправки", () => {
    expect(shouldUnlockNextLesson("after_submission", "submitted")).toBe(true);
  });

  it("after_approval не открывает урок до одобрения", () => {
    expect(shouldUnlockNextLesson("after_approval", "submitted")).toBe(false);
    expect(shouldUnlockNextLesson("after_approval", "approved")).toBe(true);
  });

  it("manual открывается только вручную", () => {
    expect(shouldUnlockNextLesson("manual", "approved")).toBe(false);
    expect(shouldUnlockNextLesson("manual", "manual")).toBe(true);
  });
});

describe("проверка заданий и изоляция", () => {
  it("администратор может принять работу", () => {
    expect(canReviewSubmission({ role: "admin", isBlocked: false, action: "approve" })).toBe(true);
    expect(canReviewSubmission({ role: "student", isBlocked: false, action: "approve" })).toBe(false);
  });

  it("администратор возвращает работу только с комментарием", () => {
    expect(canReviewSubmission({ role: "admin", isBlocked: false, action: "revision" })).toBe(false);
    expect(canReviewSubmission({ role: "admin", isBlocked: false, action: "revision", comment: "Добавьте скриншот" })).toBe(true);
  });

  it("ученик не видит чужие задания", () => {
    expect(canReadSubmission({ viewerId: "student-a", ownerId: "student-b", viewerRole: "student" })).toBe(false);
    expect(canReadSubmission({ viewerId: "admin", ownerId: "student-b", viewerRole: "admin" })).toBe(true);
  });

  it("одинаковое событие получает один idempotency key", () => {
    const first = notificationIdempotencyKey("approved", "submission-1", "v2");
    const repeated = notificationIdempotencyKey("approved", "submission-1", "v2");
    expect(first).toBe(repeated);
  });
});
