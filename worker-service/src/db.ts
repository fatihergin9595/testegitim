import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

export const logCorrUp = async (params: {
  yapan: string;
  hedef: string;
  miktar: number;
  durum: "basarili" | "basarisiz";
  hataMesaji?: string;
}) => {
  await pool.query(
    `INSERT INTO corr_up_logs (yapan, hedef, miktar, durum, hata_mesaji)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.yapan, params.hedef, params.miktar, params.durum, params.hataMesaji ?? null]
  );
};

export interface RaporSonuc {
  toplam: number;
  basarili: number;
  toplamMiktar: number;
}

export const getRaporByDateRange = async (
  startDate: string,
  endDate: string
): Promise<RaporSonuc> => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)                                          AS toplam,
       COUNT(*) FILTER (WHERE durum = 'basarili')       AS basarili,
       COALESCE(SUM(miktar) FILTER (WHERE durum = 'basarili'), 0) AS toplam_miktar
     FROM corr_up_logs
     WHERE created_at >= $1::date AND created_at < $2::date + INTERVAL '1 day'`,
    [startDate, endDate]
  );
  const r = rows[0];
  return {
    toplam: Number(r.toplam),
    basarili: Number(r.basarili),
    toplamMiktar: Number(r.toplam_miktar),
  };
};
