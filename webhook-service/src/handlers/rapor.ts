import { publish } from "../nats";

export const handleRapor = async (
  text: string,
  from: string,
  chatId: number
): Promise<string> => {
  const parts = text.trim().split(/\s+/);

  if (parts.length !== 3) {
    return "Kullanim: /rapor <baslangic-tarih> <bitis-tarih>\nOrnek: /rapor 2024-01-01 2024-01-31";
  }

  const [, startDate, endDate] = parts;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return "Tarih formati yanlis. YYYY-MM-DD kullanin.";
  }

  try {
    await publish("rapor.talep", { startDate, endDate, requestedBy: from, chatId });
    console.log(`[RAPOR] Publish edildi → ${startDate} - ${endDate}`);
    return `Rapor hazirlaniyor: ${startDate} - ${endDate}`;
  } catch (err) {
    console.error("[RAPOR] NATS publish hatası:", err);
    return "Sistem hatası, lütfen tekrar deneyin.";
  }
};
