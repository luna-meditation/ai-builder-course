import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("production security boundaries", () => {
  it("guards every admin mutation route with a real admin session", () => {
    const routes = globSync("app/api/admin/**/route.ts");
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) expect(read(route), route).toContain('requireApiSession("admin")');
  });

  it("does not import server environment or service-role clients into client components", () => {
    const clientFiles = globSync("components/**/*.tsx").filter((path) => read(path).startsWith('"use client"'));
    for (const file of clientFiles) {
      expect(read(file), file).not.toContain("@/lib/supabase/admin");
      expect(read(file), file).not.toContain("@/lib/env");
    }
  });

  it("keeps development seed out of production commands", () => {
    const seed = read("supabase/seed.sql");
    const netlify = read("netlify.toml");
    const packageJson = read("package.json");
    expect(seed).toMatch(/^-- Development-only seed\./);
    expect(netlify).toContain('NEXT_PUBLIC_DEV_MODE = "false"');
    expect(netlify).not.toContain("supabase db reset");
    expect(packageJson).not.toContain('"postinstall":');
  });

  it("returns from preview by disabling the preview claim", () => {
    expect(read("components/student-preview-bar.tsx")).toContain("JSON.stringify({ enabled: false })");
    expect(read("components/admin/admin-nav.tsx")).toContain("JSON.stringify({ enabled: true })");
  });
});
