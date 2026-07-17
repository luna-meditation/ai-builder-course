import { AdminNav } from "@/components/admin/admin-nav";
import { requireSession } from "@/lib/auth/session";
import { getActiveProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("admin");
  const profile = await getActiveProfile(session, "admin");
  return <div className="min-h-screen"><AdminNav firstName={profile.first_name} /><main className="safe-top mx-auto max-w-[1440px] px-4 pb-28 pt-7 sm:px-7 lg:ml-64 lg:px-10 lg:pb-12">{children}</main></div>;
}
