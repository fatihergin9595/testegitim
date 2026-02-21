import { getRaporByDateRange } from "../db";

interface RaporMessage {
  startDate: string;
  endDate: string;
  requestedBy: string;
  chatId: number;
}

export const handleRapor = async (payload: RaporMessage) => {
  const { startDate, endDate, requestedBy, chatId } = payload;

  console.log(`[RAPOR] Sorgu | ${startDate} - ${endDate} | isteyen:${requestedBy}`);

  try {
    const sonuc = await getRaporByDateRange(startDate, endDate);

    let text: string;

    if (sonuc.toplam === 0) {
      text = `${startDate} - ${endDate} arasında kayıt yok.`;
    } else {
      text =
        `Rapor (${startDate} - ${endDate})\n\n` +
        `Gelen İşlem Sayısı: ${sonuc.toplam}\n` +
        `Başarılı İşlem Sayısı: ${sonuc.basarili}\n` +
        `Toplam Eklenen Bonus Miktarı: ${sonuc.toplamMiktar.toFixed(2)} TL`;
    }

    try {
      await sendTelegramMessage(chatId, text);
    } catch (telegramErr) {
      console.error("[RAPOR] Telegram bildirim hatası:", telegramErr);
    }
  } catch (err) {
    console.error("[RAPOR] Hata:", err);
    try {
      await sendTelegramMessage(chatId, "Rapor alınırken hata oluştu. Lütfen tekrar deneyin.");
    } catch (telegramErr) {
      console.error("[RAPOR] Telegram bildirim hatası:", telegramErr);
    }
  }
};

const sendTelegramMessage = async (chatId: number, text: string) => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};
