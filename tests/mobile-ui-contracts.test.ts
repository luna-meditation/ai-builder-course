import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");
const adminNav = readFileSync("components/admin/admin-nav.tsx", "utf8");
const editor = readFileSync("components/admin/course-editor.tsx", "utf8");

describe("Telegram mobile UI contracts", () => {
  it("reserves the bottom safe area for fixed navigation", () => {
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(adminLayout).toContain("env(safe-area-inset-bottom)");
  });

  it("keeps only the five primary admin destinations in mobile navigation", () => {
    expect(adminNav).toContain("grid-cols-5");
    expect(adminNav).not.toContain("Сменить");
  });

  it("contains horizontal scrolling inside lesson tabs and prevents block min-content overflow", () => {
    expect(editor).toContain("overflow-x-auto");
    expect(editor).toContain("overscroll-x-contain");
    expect(editor).toContain("min-w-0 max-w-full overflow-hidden");
  });

  it("supports keyboard and touch reorder controls", () => {
    expect(editor).toContain("Переместить блок выше");
    expect(editor).toContain("Переместить блок ниже");
    expect(editor).toContain("Переместить урок");
  });
});
