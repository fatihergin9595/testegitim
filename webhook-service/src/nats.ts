import { connect, NatsConnection, JetStreamClient, JSONCodec } from "nats";

let nc: NatsConnection | null = null;
let js: JetStreamClient | null = null;
const jc = JSONCodec();

export const connectNats = async () => {
  nc = await connect({ servers: process.env.NATS_URL || "nats://localhost:4222" });

  const jsm = await nc.jetstreamManager();
  try {
    await jsm.streams.info("EGITIM");
    console.log("[NATS] Stream zaten mevcut: EGITIM");
  } catch {
    await jsm.streams.add({
      name: "EGITIM",
      subjects: ["corr_up.talep", "rapor.talep"],
    });
    console.log("[NATS] Stream oluşturuldu: EGITIM");
  }

  js = nc.jetstream();
  console.log(`[NATS] JetStream bağlantısı hazır`);
};

export const publish = async (subject: string, payload: unknown) => {
  if (!js) throw new Error("JetStream bağlantısı yok");

  const ack = await js.publish(subject, jc.encode(payload));
  console.log(`[NATS] Publish OK → ${subject} (seq: ${ack.seq})`);
};
