// Envío de mensajes por Telegram (Bot API). El token del bot es secreto de la
// app (TELEGRAM_BOT_TOKEN en .env); el chat_id es por usuario (en preferences).

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export function telegramConfigured(): boolean {
  return !!TOKEN;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: "El bot no está configurado (TELEGRAM_BOT_TOKEN)" };
  if (!chatId) return { ok: false, error: "Falta el chat_id" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description ?? "Error de Telegram" };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo contactar con Telegram" };
  }
}
