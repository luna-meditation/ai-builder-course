import { describe, expect, it } from "vitest";
import { canAccessAdminSurface, canEnterStudentPreview, canMutateWhilePreviewing, isBootstrapAdminTelegramId } from "@/lib/auth/access";
import type { SessionUser } from "@/lib/types";

function session(role: SessionUser["role"], previewAsStudent = false): SessionUser {
  return {
    profileId: "c1111111-1111-4111-8111-111111111111",
    telegramUserId: "100000001",
    firstName: "Тест",
    username: null,
    role,
    previewAsStudent,
  };
}

describe("admin student preview authorization", () => {
  it("determines bootstrap admin status only from the configured Telegram IDs", () => {
    const adminIds = new Set(["100000002", "777"]);
    expect(isBootstrapAdminTelegramId("100000002", adminIds)).toBe(true);
    expect(isBootstrapAdminTelegramId("100000001", adminIds)).toBe(false);
  });
  it("allows a real admin to use the admin surface", () => {
    expect(canAccessAdminSurface(session("admin"))).toBe(true);
  });

  it("denies the admin surface while previewing a student", () => {
    const preview = session("admin", true);
    expect(canAccessAdminSurface(preview)).toBe(false);
    expect(canMutateWhilePreviewing(preview)).toBe(false);
  });

  it("never grants preview or admin access to a student", () => {
    const student = session("student");
    expect(canEnterStudentPreview(student)).toBe(false);
    expect(canAccessAdminSurface(student)).toBe(false);
  });

  it("keeps the real admin identity when entering and leaving preview", () => {
    const admin = session("admin");
    const preview = { ...admin, previewAsStudent: true };
    const returned = { ...preview, previewAsStudent: false };
    expect(preview.role).toBe("admin");
    expect(preview.telegramUserId).toBe(admin.telegramUserId);
    expect(canAccessAdminSurface(returned)).toBe(true);
  });
});
