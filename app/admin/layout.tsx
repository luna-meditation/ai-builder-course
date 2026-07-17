import { AdminNav } from "@/components/admin/admin-nav";
import { requireSession } from "@/lib/auth/session";
import { getCachedAdminProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("admin");
  const profile = await getCachedAdminProfile(session);
  return <div className="min-h-screen"><AdminNav firstName={profile.first_name} /><main className="mx-auto min-w-0 max-w-[1440px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-7 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8">{children}</main></div>;
}
