import { publish } from "../nats";

export const handleEkle = async (
  text: string,
  from: string,
  chatId: number
): Promise<string | null> => {
  const parts = text.trim().split(/\s+/);

  if (parts.length !== 3) {
    return "Kullanim: /ekle <username> <miktar>";
  }

  const [, username, amountStr] = parts;
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    return "Gecersiz miktar. Ornek: /ekle ahmet123 500";
  }

  try {
    await publish("corr_up.talep", { username, amount, requestedBy: from, chatId });
    console.log(`[EKLE] Publish edildi → ${username} ${amount}`);
    return null;
  } catch (err) {
    console.error("[EKLE] NATS publish hatası:", err);
    return "Sistem hatası, lütfen tekrar deneyin.";
  }
};
