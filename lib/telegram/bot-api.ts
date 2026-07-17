import "server-only";

import { z } from "zod";
import { getServerEnv } from "@/lib/env";

const telegramResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  error_code: z.number().optional(),
  description: z.string().optional(),
});

export type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<
    | { text: string; web_app: { url: string } }
    | { text: string; url: string }
  >>;
};

export function miniAppKeyboard(label: string, appUrl: string): TelegramReplyMarkup {
  return { inline_keyboard: [[{ text: label, web_app: { url: appUrl } }]] };
}

export async function callTelegramBotApi<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
  const env = getServerEnv();
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  const parsed = telegramResponseSchema.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success || !parsed.data.ok) {
    console.error("telegram_bot_api_failed", {
      method,
      status: response.status,
      errorCode: parsed.success ? parsed.data.error_code : undefined,
    });
    throw new Error(`Telegram Bot API method ${method} failed`);
  }
  return parsed.data.result as T;
}

export async function sendTelegramMessage(input: {
  chatId: string | number;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
}) {
  return callTelegramBotApi("sendMessage", {
    chat_id: input.chatId,
    text: input.text,
    ...(input.replyMarkup ? { reply_markup: input.replyMarkup } : {}),
  });
}
