import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const telegramUserSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).max(128),
  last_name: z.string().max(128).optional(),
  username: z.string().max(64).optional(),
  language_code: z.string().max(16).optional(),
  photo_url: z.url().optional(),
});

export type TelegramUser = z.infer<typeof telegramUserSchema>;

export class TelegramAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramAuthError";
  }
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  now = Date.now(),
  maxAgeSeconds = 86_400,
): TelegramUser {
  if (!initData || initData.length > 16_384) {
    throw new TelegramAuthError("Telegram initData отсутствует или имеет неверный размер");
  }

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDateRaw = params.get("auth_date");
  const userRaw = params.get("user");

  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash) || !authDateRaw || !userRaw) {
    throw new TelegramAuthError("Telegram initData не содержит обязательных полей");
  }

  const authDate = Number(authDateRaw);
  const age = Math.floor(now / 1000) - authDate;
  if (!Number.isInteger(authDate) || age < -30 || age > maxAgeSeconds) {
    throw new TelegramAuthError("Telegram initData устарел");
  }

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest();
  const receivedBuffer = Buffer.from(receivedHash, "hex");

  if (receivedBuffer.length !== expectedHash.length || !timingSafeEqual(expectedHash, receivedBuffer)) {
    throw new TelegramAuthError("Подпись Telegram initData не прошла проверку");
  }

  let user: unknown;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new TelegramAuthError("Данные Telegram-пользователя повреждены");
  }

  const parsed = telegramUserSchema.safeParse(user);
  if (!parsed.success) {
    throw new TelegramAuthError("Профиль Telegram имеет неверный формат");
  }
  return parsed.data;
}
