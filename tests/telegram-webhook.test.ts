import { describe, expect, it } from "vitest";
import { parseBotCommand, verifyTelegramWebhookSecret, webhookSecretSchema } from "@/lib/telegram/webhook";

describe("Telegram webhook security", () => {
  const secret = "valid_webhook_secret_123456789";

  it("принимает только точный webhook secret", () => {
    expect(verifyTelegramWebhookSecret(secret, secret)).toBe(true);
    expect(verifyTelegramWebhookSecret("invalid_webhook_secret", secret)).toBe(false);
    expect(verifyTelegramWebhookSecret(null, secret)).toBe(false);
  });

  it("ограничивает webhook secret разрешёнными Telegram символами", () => {
    expect(webhookSecretSchema.safeParse(secret).success).toBe(true);
    expect(webhookSecretSchema.safeParse("contains spaces and !").success).toBe(false);
    expect(webhookSecretSchema.safeParse("short").success).toBe(false);
  });
});

describe("Telegram bot commands", () => {
  it("распознаёт команды и суффикс username", () => {
    expect(parseBotCommand("/start")).toBe("start");
    expect(parseBotCommand("/course@ai_builder_bot extra")).toBe("course");
    expect(parseBotCommand("  /support ")).toBe("support");
  });

  it("игнорирует неизвестные сообщения", () => {
    expect(parseBotCommand("Привет")).toBeNull();
    expect(parseBotCommand("/unknown")).toBeNull();
    expect(parseBotCommand(undefined)).toBeNull();
  });
});
