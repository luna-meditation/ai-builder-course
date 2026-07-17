import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export async function trackEvent(
  userId: string,
  eventName: string,
  properties: Record<string, unknown> = {},
) {
  const { error } = await getAdminClient().from("analytics_events").insert({
    user_id: userId,
    event_name: eventName,
    properties,
  });
  if (error) console.error("analytics_event_failed", { eventName, code: error.code });
}
