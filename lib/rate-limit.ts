import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const { data, error } = await getAdminClient().rpc("consume_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Не удалось проверить ограничение частоты запросов");
  if (!data) {
    const error = new Error("Слишком много запросов. Попробуйте немного позже.");
    error.name = "RateLimitError";
    throw error;
  }
}
