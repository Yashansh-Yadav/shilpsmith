import { logger } from "./logger";

// Telegram Bot API sender for admin alerts. Free, no approvals/templates, and
// works on serverless (one HTTPS call). Tolerant of missing config like the
// other notification channels — returns {sent:false} and logs instead of
// throwing so the dispatcher never breaks a request.
//
// Setup: create a bot via @BotFather → TELEGRAM_BOT_TOKEN. Press Start on the
// bot, then read your chat id (e.g. via @userinfobot or the getUpdates call) →
// TELEGRAM_CHAT_ID. For a team, use a group's chat id instead.

export async function sendTelegramNotification(
  text: string
): Promise<{ sent: boolean; reason?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.warn("Telegram not configured, skipping notification");
    return { sent: false, reason: "not-configured" };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // Plain text (no parse_mode) — avoids Markdown/HTML escaping pitfalls
        // with order numbers, emails, and URLs in the message body.
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("Telegram API rejected message", {
        status: res.status,
        body: body.slice(0, 500),
      });
      return { sent: false, reason: "api-error" };
    }

    return { sent: true };
  } catch (error) {
    logger.error("Telegram request failed", { error });
    return { sent: false, reason: "network" };
  }
}
