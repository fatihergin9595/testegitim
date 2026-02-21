import { validateAndCorrUp } from "../betco";
import { logCorrUp } from "../db";

interface EkleMessage {
  username: string;
  amount: number;
  requestedBy: string;
  chatId: number;
}

export const handleEkle = async (payload: EkleMessage) => {
  const { username, amount, requestedBy, chatId } = payload;

  console.log(`[EKLE] İşlem başladı | hedef:${username} miktar:${amount} yapan:${requestedBy}`);

  try {
    await validateAndCorrUp(username, amount);

    try {
      await logCorrUp({
        yapan: requestedBy,
        hedef: username,
        miktar: amount,
        durum: "basarili",
      });
    } catch (dbErr) {
      console.error("[EKLE] DB log hatası (başarılı):", dbErr);
    }

    console.log(`[EKLE] Başarılı | ${username} → ${amount}`);
    try {
      await sendTelegramMessage(chatId, `✅ ${username} hesabına ${amount} TL eklendi.`);
    } catch (telegramErr) {
      console.error("[EKLE] Telegram bildirim hatası (başarılı):", telegramErr);
    }
  } catch (err) {
    const hataMesaji = err instanceof Error ? err.message : "Bilinmeyen hata";

    try {
      await logCorrUp({
        yapan: requestedBy,
        hedef: username,
        miktar: amount,
        durum: "basarisiz",
        hataMesaji,
      });
    } catch (dbErr) {
      console.error("[EKLE] DB log hatası (başarısız):", dbErr);
    }

    console.error(`[EKLE] Başarısız | ${username} → ${hataMesaji}`);
    try {
      await sendTelegramMessage(chatId, `❌ ${username}\nİşlem başarısız. ${formatHata(hataMesaji)}`);
    } catch (telegramErr) {
      console.error("[EKLE] Telegram bildirim hatası (başarısız):", telegramErr);
    }
  }
};

const formatHata = (mesaj: string): string => {
  if (mesaj.includes("IsNoBonus")) return "Üye bonus alımı kapalı.";
  if (mesaj.includes("Bakiye sıfır değil")) return "Üye bakiyesi mevcut.";
  if (mesaj.includes("Bonus bakiye")) return "Üyenin aktif bonus bakiyesi var.";
  if (mesaj.includes("Aktif spor bahsi")) return "Üyenin aktif spor bahsi var.";
  if (mesaj.includes("Üye bulunamadı")) return "Üye bulunamadı.";
  return mesaj;
};

const sendTelegramMessage = async (chatId: number, text: string) => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};
