import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

let client: SupabaseClient | undefined;

export function getAdminClient() {
  if (!client) {
    const env = getServerEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { "X-Client-Info": "ai-builder-server" } },
    });
  }
  return client;
}
