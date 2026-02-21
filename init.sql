CREATE TABLE IF NOT EXISTS corr_up_logs (
    id          SERIAL PRIMARY KEY,
    yapan       TEXT NOT NULL,
    hedef       TEXT NOT NULL,
    miktar      NUMERIC(10, 2) NOT NULL,
    durum       TEXT NOT NULL CHECK (durum IN ('basarili', 'basarisiz')),
    hata_mesaji TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corr_up_logs_created_at ON corr_up_logs (created_at);
