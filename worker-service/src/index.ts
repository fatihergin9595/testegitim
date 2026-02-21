import "dotenv/config";
import { connect, JSONCodec, AckPolicy } from "nats";
import { handleEkle } from "./handlers/ekle";
import { handleRapor } from "./handlers/rapor";

const jc = JSONCodec();

const start = async () => {
  const nc = await connect({
    servers: process.env.NATS_URL || "nats://localhost:4222",
  });

  console.log(`[WORKER] NATS'a bağlandı`);

  const jsm = await nc.jetstreamManager();
  const js = nc.jetstream();

  try {
    await jsm.streams.info("EGITIM");
    console.log("[WORKER] Stream mevcut: EGITIM");
  } catch {
    await jsm.streams.add({
      name: "EGITIM",
      subjects: ["corr_up.talep", "rapor.talep"],
    });
    console.log("[WORKER] Stream oluşturuldu: EGITIM");
  }

  for (const cfg of [
    { durable_name: "corr-up-worker", filter_subject: "corr_up.talep" },
    { durable_name: "rapor-worker",   filter_subject: "rapor.talep"   },
  ]) {
    try {
      await jsm.consumers.info("EGITIM", cfg.durable_name);
    } catch {
      await jsm.consumers.add("EGITIM", {
        durable_name: cfg.durable_name,
        ack_policy: AckPolicy.Explicit,
        filter_subject: cfg.filter_subject,
      });
      console.log(`[WORKER] Consumer oluşturuldu: ${cfg.durable_name}`);
    }
  }

  const corrUpConsumer = await js.consumers.get("EGITIM", "corr-up-worker");
  (async () => {
    const messages = await corrUpConsumer.consume();
    for await (const msg of messages) {
      const payload = jc.decode(msg.data) as any;
      console.log(`[WORKER] corr_up.talep alındı:`, payload);
      try {
        await handleEkle(payload);
        msg.ack();
      } catch (err) {
        console.error("[WORKER] Beklenmedik hata (handleEkle):", err);
        msg.nak(5000);
      }
    }
  })();

  const raporConsumer = await js.consumers.get("EGITIM", "rapor-worker");
  (async () => {
    const messages = await raporConsumer.consume();
    for await (const msg of messages) {
      const payload = jc.decode(msg.data) as any;
      console.log(`[WORKER] rapor.talep alındı:`, payload);
      try {
        await handleRapor(payload);
        msg.ack();
      } catch (err) {
        console.error("[WORKER] Beklenmedik hata (handleRapor):", err);
        msg.nak(5000);
      }
    }
  })();

  console.log(`[WORKER] Consumer'lar dinleniyor...`);

  const shutdown = async () => {
    console.log("[WORKER] Kapatılıyor...");
    await nc.drain();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

start().catch((err) => {
  console.error("[WORKER] Başlatma hatası:", err);
  process.exit(1);
});
