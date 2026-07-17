import "server-only";

import { getServerEnv } from "@/lib/env";
import { getAdminClient } from "@/lib/supabase/admin";
import { miniAppKeyboard, sendTelegramMessage } from "@/lib/telegram/bot-api";

type NotificationType =
  | "access_granted"
  | "submission_sent"
  | "lesson_unlocked"
  | "submission_approved"
  | "revision_requested"
  | "course_completed";

const messages: Record<NotificationType, string> = {
  access_granted: "Доступ к курсу открыт. Нажмите кнопку ниже, чтобы начать обучение.",
  submission_sent: "Домашнее задание по уроку отправлено.",
  lesson_unlocked: "Следующий урок уже доступен.",
  submission_approved: "Работа принята. Отличный результат.",
  revision_requested: "Работу нужно немного доработать. Комментарий уже находится в личном кабинете.",
  course_completed: "Поздравляем! Вы завершили курс и создали свои первые продукты с помощью ИИ.",
};

export async function sendTelegramNotification(input: {
  userId: string;
  telegramUserId: string;
  type: NotificationType;
  relatedEntityId?: string;
  idempotencyKey: string;
}) {
  const supabase = getAdminClient();
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "notifications").maybeSingle();
  if ((setting?.value as { enabled?: boolean } | undefined)?.enabled === false) return { skipped: true };
  const { data: log, error: insertError } = await supabase
    .from("notifications_log")
    .insert({
      user_id: input.userId,
      notification_type: input.type,
      related_entity_id: input.relatedEntityId ?? null,
      idempotency_key: input.idempotencyKey,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError?.code === "23505") return { skipped: true };
  if (insertError || !log) throw new Error("Не удалось создать запись уведомления");

  const env = getServerEnv();
  try {
    await sendTelegramMessage({
      chatId: input.telegramUserId,
      text: messages[input.type],
      replyMarkup: miniAppKeyboard("Открыть AI BUILDER", env.NEXT_PUBLIC_APP_URL),
    });
    await supabase
      .from("notifications_log")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", log.id);
    return { skipped: false };
  } catch (error) {
    await supabase
      .from("notifications_log")
      .update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown" })
      .eq("id", log.id);
    console.error("telegram_notification_failed", { type: input.type, logId: log.id });
    return { skipped: false, failed: true };
  }
}
