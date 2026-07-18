import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bootstrapDestination, hasCourseAccess, resolveAccessStatus, telegramProfileRpcInput } from "@/lib/auth/bootstrap";

const migration = readFileSync("supabase/migrations/202607170003_telegram_profile_bootstrap.sql", "utf8");
const initialSchema = readFileSync("supabase/migrations/202607170001_initial_schema.sql", "utf8");
const authRoute = readFileSync("app/api/auth/telegram/route.ts", "utf8");

describe("automatic Telegram registration", () => {
  it("maps only verified Telegram fields and never accepts a client role", () => {
    const input = telegramProfileRpcInput({
      id: 777,
      first_name: "Новый",
      username: "new_user",
      language_code: "ru",
      photo_url: "https://example.com/photo.jpg",
    }, false);
    expect(input).toMatchObject({ p_telegram_user_id: 777, p_first_name: "Новый", p_bootstrap_admin: false });
    expect(input).not.toHaveProperty("role");
  });

  it("creates ordinary users as students without granting course access", () => {
    expect(migration).toContain("else 'student'::public.user_role");
    expect(migration).not.toContain("insert into public.enrollments");
    expect(resolveAccessStatus({ isBlocked: false, enrollmentStatus: null })).toBe("no_access");
    expect(hasCourseAccess("no_access")).toBe(false);
  });

  it("uses the unique Telegram ID and an atomic conflict path for simultaneous requests", () => {
    expect(initialSchema).toContain("telegram_user_id bigint not null unique");
    expect(migration).toContain("on conflict (telegram_user_id) do nothing");
    expect(migration).toContain("where profile.telegram_user_id = p_telegram_user_id");
    expect(migration).toContain("v_is_new := true");
  });

  it("preserves an existing role unless the verified ID is server allowlisted", () => {
    expect(migration).toContain("else profile.role end");
    expect(authRoute).toContain("isBootstrapAdminTelegramId");
    expect(authRoute).toContain('const schema = z.object({ initData: z.string().min(1).max(16_384) })');
  });

  it("allows only the service role to execute the registration function", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("routes active students to the course and no-access students to the registration result screen", () => {
    expect(resolveAccessStatus({ isBlocked: false, enrollmentStatus: "active" })).toBe("active");
    expect(resolveAccessStatus({ isBlocked: false, enrollmentStatus: "revoked" })).toBe("revoked");
    expect(bootstrapDestination("student", "active")).toBe("/course");
    expect(bootstrapDestination("admin", "no_access")).toBe("/admin");
  });

  it("returns the new-profile state in the secure session and invalidates the admin list", () => {
    expect(authRoute).toContain("isNewUser: profile.is_new");
    expect(authRoute).toContain("if (profile.is_new) invalidateAdminData()");
    expect(readFileSync("lib/data.ts", "utf8")).toContain('profile.role === "student" || profile.enrollments.length > 0');
  });
});
