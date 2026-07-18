import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/auth/telegram";

const token = "123456789:abcdefghijklmnopqrstuvwxyzABCDE";

function signedInitData(overrides: Record<string, string> = {}) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: "AAEAAAE",
    user: JSON.stringify({ id: 123456789, first_name: "Тест", username: "tester", language_code: "ru" }),
    ...overrides,
  });
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return params.toString();
}

describe("Telegram initData", () => {
  it("проверяет подпись и возвращает подтверждённого пользователя", () => {
    expect(verifyTelegramInitData(signedInitData(), token)).toMatchObject({ id: 123456789, username: "tester", language_code: "ru" });
  });

  it("отклоняет подменённые данные", () => {
    const data = signedInitData().replace("tester", "attacker");
    expect(() => verifyTelegramInitData(data, token)).toThrow(TelegramAuthError);
  });

  it("отклоняет устаревшие данные", () => {
    const old = String(Math.floor(Date.now() / 1000) - 90_000);
    expect(() => verifyTelegramInitData(signedInitData({ auth_date: old }), token)).toThrow("устарел");
  });

  it("отклоняет пустые initData", () => {
    expect(() => verifyTelegramInitData("", token)).toThrow(TelegramAuthError);
  });
});
