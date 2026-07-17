const mode = process.argv[2] ?? "set";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function telegramApi(token, method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) {
    throw new Error(`Telegram method ${method} failed with status ${response.status}`);
  }
  return body.result;
}

async function setWebhook(token) {
  const appUrl = new URL(required("NEXT_PUBLIC_APP_URL"));
  if (appUrl.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(appUrl.hostname)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be the production HTTPS URL");
  }
  const secret = required("TELEGRAM_WEBHOOK_SECRET");
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(secret)) {
    throw new Error("TELEGRAM_WEBHOOK_SECRET must contain 16-256 letters, digits, underscores or hyphens");
  }

  const webhookUrl = new URL("/api/telegram/webhook", appUrl.origin).toString();
  await telegramApi(token, "setWebhook", {
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
  await telegramApi(token, "setMyCommands", {
    commands: [
      { command: "start", description: "Начать работу с курсом" },
      { command: "course", description: "Продолжить обучение" },
      { command: "support", description: "Связаться с поддержкой" },
    ],
  });
  await telegramApi(token, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "Открыть курс",
      web_app: { url: appUrl.toString() },
    },
  });
  console.log(`Telegram webhook installed: ${webhookUrl}`);
  console.log("Commands and the default Mini App menu button were updated.");
}

async function showInfo(token) {
  const info = await telegramApi(token, "getWebhookInfo");
  console.log(JSON.stringify({
    url: info?.url ?? "",
    pendingUpdateCount: info?.pending_update_count ?? 0,
    lastErrorDate: info?.last_error_date ?? null,
    lastErrorMessage: info?.last_error_message ?? null,
  }, null, 2));
}

async function deleteWebhook(token) {
  await telegramApi(token, "deleteWebhook", { drop_pending_updates: false });
  console.log("Telegram webhook removed.");
}

try {
  const token = required("TELEGRAM_BOT_TOKEN");
  if (mode === "set") await setWebhook(token);
  else if (mode === "info") await showInfo(token);
  else if (mode === "delete") await deleteWebhook(token);
  else throw new Error("Unknown mode. Use set, info or delete.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Telegram webhook setup failed");
  process.exitCode = 1;
}
