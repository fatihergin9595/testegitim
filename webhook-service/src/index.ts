import "dotenv/config";
import express from "express";
import { connectNats } from "./nats";
import { handleEkle } from "./handlers/ekle";
import { handleRapor } from "./handlers/rapor";

const app = express();
app.use(express.json());

const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;

const processedUpdates = new Set<number>();
const markProcessed = (updateId: number) => {
  processedUpdates.add(updateId);
  setTimeout(() => processedUpdates.delete(updateId), 10 * 60 * 1000);
};

app.post(`/webhook/${WEBHOOK_SECRET}`, async (req, res) => {
  res.sendStatus(200);

  try {
    const update = req.body;
    const updateId: number = update?.update_id;

    if (processedUpdates.has(updateId)) {
      console.log(`[WEBHOOK] Duplicate update_id: ${updateId} — atlandı`);
      return;
    }
    markProcessed(updateId);

    const message = update?.message;

    if (!message?.text) return;

    const chatId: number = message.chat.id;
    const from: string = message.from?.username || String(message.from?.id);
    const text: string = message.text;

    if (ALLOWED_CHAT_ID && String(chatId) !== ALLOWED_CHAT_ID) {
      console.log(`[WEBHOOK] Yetkisiz chat: ${chatId}`);
      return;
    }

    console.log(`[WEBHOOK] Gelen mesaj | chat:${chatId} | from:${from} | text:"${text}"`);

    if (text.startsWith("/ekle")) {
      const err = await handleEkle(text, from, chatId);
      if (err) await sendTelegramMessage(chatId, err);
    } else if (text.startsWith("/rapor")) {
      const err = await handleRapor(text, from, chatId);
      if (err) await sendTelegramMessage(chatId, err);
    } else if (text.startsWith("/start")) {
      await sendTelegramMessage(chatId, "Komutlar:\n/ekle <username> <miktar>\n/rapor <baslangic> <bitis>");
    }
  } catch (err) {
    console.error("[WEBHOOK] İşlenemeyen hata:", err);
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const sendTelegramMessage = async (chatId: number, text: string) => {
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};

const shutdown = async () => {
  console.log("[WEBHOOK] Kapatılıyor...");
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const start = async () => {
  if (!WEBHOOK_SECRET) {
    throw new Error("WEBHOOK_SECRET tanımlı değil — .env dosyasını kontrol et");
  }
  if (!process.env.BOT_TOKEN) {
    throw new Error("BOT_TOKEN tanımlı değil — .env dosyasını kontrol et");
  }

  await connectNats();
  app.listen(PORT, () => {
    console.log(`[WEBHOOK] Sunucu ayakta: http://localhost:${PORT}`);
    console.log(`[WEBHOOK] Endpoint: /webhook/${WEBHOOK_SECRET}`);
  });
};

start().catch((err) => {
  console.error("[WEBHOOK] Başlatma hatası:", err);
  process.exit(1);
});
