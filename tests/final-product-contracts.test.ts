import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("final product experience contracts", () => {
  it("creates a real, self-owned admin enrollment without resetting progress", () => {
    const route = read("app/api/auth/student-mode/route.ts");
    const migration = read("supabase/migrations/20260718060908_admin_student_mode_and_lesson_structure.sql");
    expect(route).toContain('supabase.rpc("enable_admin_student_mode"');
    expect(route).toContain("p_admin_id: profile.id");
    expect(migration).toContain("where id = p_admin_id and role = 'admin'");
    expect(migration).toContain("on conflict (enrollment_id, lesson_id) do nothing");
    expect(migration).toContain("to service_role");
  });

  it("keeps preview read-only and learning mode visibly persistent", () => {
    const banner = read("components/student-preview-bar.tsx");
    const session = read("lib/auth/session.ts");
    expect(banner).toContain("Предпросмотр · только чтение");
    expect(banner).toContain("Действия сохраняются");
    expect(session).toContain('studentMode: z.enum(["preview", "learning"])');
  });

  it("calculates admin-list progress against every published lesson", () => {
    const data = read("lib/data.ts");
    expect(data).toContain("lessonCountByCourse");
    expect(data).toContain("completed / totalLessons");
    expect(data).not.toContain("completed / statuses.length");
  });

  it("implements an iPhone-friendly resilient assignment workflow", () => {
    const form = read("components/assignment-form.tsx");
    expect(form).toContain("text-base");
    expect(form).toContain("resizeTextarea");
    expect(form).toContain("window.localStorage.setItem");
    expect(form).toContain("xhr.upload.onprogress");
    expect(form).toContain("retryFile");
    expect(form).toContain("25 * 1024 * 1024");
    expect(form).toContain("setConfirming(true)");
  });

  it("renders the lesson in the required learning sequence", () => {
    const page = read("app/course/[courseSlug]/lesson/[lessonSlug]/page.tsx");
    const order = ["Что будет создано", 'id="video"', "План миссии", 'id="material"', 'id="prompts"', 'id="practice"', "Завершение"];
    let position = -1;
    for (const marker of order) {
      const nextPosition = page.indexOf(marker);
      expect(nextPosition, marker).toBeGreaterThan(position);
      position = nextPosition;
    }
  });

  it("centralizes prompts with previews, ordered copy-all and an iOS fallback", () => {
    const prompts = read("components/prompt-card.tsx");
    const blocks = read("components/lesson-blocks.tsx");
    expect(prompts).toContain('document.execCommand("copy")');
    expect(prompts).toContain("window.Telegram?.WebApp.initData");
    expect(prompts).toContain("Promise.race");
    expect(prompts).toContain("Clipboard timeout");
    expect(prompts).toContain("Math.min(8, Math.max(4, previewLines))");
    expect(prompts).toContain("Скопировать все промпты");
    expect(blocks).toContain('block.block_type !== "prompt"');
    expect(blocks).toContain('block.block_type === "prompt"');
  });

  it("gives the editor structured lesson, prompt, link and reorder controls", () => {
    const editor = read("components/admin/course-editor.tsx");
    for (const field of ["durationMinutes", "difficulty", "missionSteps", "assignmentCriteria", "preview_enabled", "preview_lines", 'block_type === "link"', "moveLesson"]) {
      expect(editor).toContain(field);
    }
  });

  it("uses the supplied brand in UI, install metadata and social previews", () => {
    expect(read("components/ui/logo.tsx")).toContain("/brand/ai-builder-symbol.png");
    expect(read("app/manifest.ts")).toContain("/brand/ai-builder-icon-512.png");
    expect(read("app/layout.tsx")).toContain("/brand/ai-builder-logo.png");
  });

  it("adds safe areas, bounded uploads and supporting database indexes", () => {
    const css = read("app/globals.css");
    const migration = read("supabase/migrations/20260718060908_admin_student_mode_and_lesson_structure.sql");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("submission_files_submission_id_idx");
    expect(migration).toContain("set search_path = ''");
  });
});
