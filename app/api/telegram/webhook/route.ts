import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { miniAppKeyboard, sendTelegramMessage } from "@/lib/telegram/bot-api";
import { parseBotCommand, telegramUpdateSchema, verifyTelegramWebhookSecret, webhookSecretSchema } from "@/lib/telegram/webhook";

export const dynamic = "force-dynamic";

async function getSupportContact() {
  const { data, error } = await getAdminClient().from("app_settings").select("value").eq("key", "support").maybeSingle();
  if (error) throw new Error("Support settings unavailable");
  const support = data?.value as { username?: unknown } | undefined;
  const username = typeof support?.username === "string" ? support.username.trim().replace(/^@/, "") : "";
  return username ? `@${username}` : null;
}

async function handleUpdate(update: unknown) {
  const parsed = telegramUpdateSchema.safeParse(update);
  if (!parsed.success) return { ignored: true };

  const message = parsed.data.message;
  if (!message || message.from?.is_bot) return { ignored: true };
  const command = parseBotCommand(message.text);
  if (!command) return { ignored: true };

  if (message.chat.type !== "private" && command !== "support") {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Откройте личный чат с ботом, чтобы запустить курс.",
    });
    return { handled: true };
  }

  const env = getServerEnv();
  if (command === "start") {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Добро пожаловать в AI BUILDER! Здесь вы шаг за шагом создадите сайт, Telegram Mini App и собственную игру с помощью ИИ.",
      replyMarkup: miniAppKeyboard("Открыть курс", env.NEXT_PUBLIC_APP_URL),
    });
  } else if (command === "course") {
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: "Ваш курс готов. Откройте платформу и продолжите с текущего шага.",
      replyMarkup: miniAppKeyboard("Продолжить обучение", env.NEXT_PUBLIC_APP_URL),
    });
  } else {
    const contact = await getSupportContact();
    await sendTelegramMessage({
      chatId: message.chat.id,
      text: contact
        ? `Поддержка курса: ${contact}`
        : "Контакт поддержки пока не указан. Пожалуйста, попробуйте немного позже.",
    });
  }
  return { handled: true };
}

export async function POST(request: Request) {
  const env = getServerEnv();
  const webhookSecret = webhookSecretSchema.safeParse(env.TELEGRAM_WEBHOOK_SECRET);
  if (!webhookSecret.success) {
    console.error("telegram_webhook_not_configured");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  if (!verifyTelegramWebhookSecret(request.headers.get("x-telegram-bot-api-secret-token"), webhookSecret.data)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  try {
    const body = await request.json();
    await handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("telegram_webhook_failed", { error: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 502 });
  }
}
