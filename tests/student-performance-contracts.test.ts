import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("student experience performance contracts", () => {
  it("loads profile, enrollments, progress and course relation in one bootstrap query", () => {
    const data = read("lib/data.ts");
    expect(data).toContain('select("*, enrollments(*, lesson_progress(*), courses(*))")');
    expect(data).toContain("loadStudentBootstrap");
  });

  it("caches published course content and batches all signed file URLs", () => {
    const data = read("lib/data.ts");
    expect(data).toContain("student-course-catalog-v1");
    expect(data).toContain("revalidate: 60");
    expect(data).toContain("submissions.flatMap");
    expect(data).not.toContain("submissions.map(async");
  });

  it("does not mutate progress during server prefetch", () => {
    const data = read("lib/data.ts");
    expect(data).not.toContain('update({ status: "in_progress"');
    expect(read("components/lesson-visit.tsx")).toContain('fetch("/api/progress/start"');
  });

  it("checks access inline without a route refresh or system alert", () => {
    const component = read("components/no-access.tsx");
    expect(component).toContain('fetch("/api/access/status"');
    expect(component).toContain("loading={checking}");
    expect(component).not.toContain("router.refresh");
    expect(component).not.toContain("alert(");
  });

  it("uses client links, optimistic active navigation and explicit prefetch", () => {
    const nav = read("components/bottom-nav.tsx");
    const prefetch = read("components/student-route-prefetch.tsx");
    expect(nav).toContain('"use client"');
    expect(nav).toContain("setPendingTarget(href)");
    expect(prefetch).toContain("router.prefetch");
    expect(prefetch).toContain("prefetchedKey");
    expect(nav).toContain("<Link");
  });

  it("shows immediate route skeletons and retryable error UI", () => {
    expect(read("app/course/loading.tsx")).toContain("StudentLoading");
    expect(read("app/profile/loading.tsx")).toContain("StudentLoading");
    expect(read("app/course/error.tsx")).toContain("Повторить");
  });

  it("prevents duplicate assignment actions and avoids a full refresh after submit", () => {
    const form = read("components/assignment-form.tsx");
    expect(form).toContain("loading={submitting}");
    expect(form).toContain("disabled={uploading || preview || saving || submitting}");
    expect(form).not.toContain("window.confirm");
    expect(form).not.toContain("router.refresh");
  });

  it("keeps Telegram notifications out of the submission response critical path", () => {
    const route = read("app/api/submissions/route.ts");
    expect(route).toContain("after(async () =>");
    expect(route).toContain("submission_notification_failed");
  });
});
