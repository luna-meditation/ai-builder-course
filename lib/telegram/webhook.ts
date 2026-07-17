import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const webhookSecretSchema = z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/);

export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z.object({
    message_id: z.number().int().positive(),
    text: z.string().max(4096).optional(),
    chat: z.object({
      id: z.number().int(),
      type: z.enum(["private", "group", "supergroup", "channel"]),
    }),
    from: z.object({
      id: z.number().int().positive(),
      is_bot: z.boolean().optional(),
    }).optional(),
  }).optional(),
}).passthrough();

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type BotCommand = "start" | "course" | "support" | null;

export function verifyTelegramWebhookSecret(received: string | null, expected: string) {
  const expectedResult = webhookSecretSchema.safeParse(expected);
  if (!received || !expectedResult.success) return false;
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expectedResult.data, "utf8");
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function parseBotCommand(text: string | undefined): BotCommand {
  if (!text) return null;
  const token = text.trim().split(/\s+/, 1)[0]?.toLowerCase();
  const command = token?.split("@", 1)[0];
  if (command === "/start") return "start";
  if (command === "/course") return "course";
  if (command === "/support") return "support";
  return null;
}
