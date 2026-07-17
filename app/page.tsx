import { redirect } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { SetupState } from "@/components/setup-state";
import { getSession } from "@/lib/auth/session";
import { isDevLoginEnabled, isStandaloneDevPreview, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isSupabaseConfigured() && !isStandaloneDevPreview()) return <SetupState />;
  const session = await getSession();
  if (session) redirect(session.role === "admin" ? "/admin" : "/course");
  return <AuthGate devMode={isDevLoginEnabled()} />;
}
