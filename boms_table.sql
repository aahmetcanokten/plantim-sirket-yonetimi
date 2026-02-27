-- BOM (Bill of Materials) tablosu
CREATE TABLE IF NOT EXISTS public.boms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bom_number      TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  product_code    TEXT,
  category        TEXT DEFAULT 'Üretim',
  revision        TEXT DEFAULT '1.0',
  unit            TEXT DEFAULT 'Adet',
  description     TEXT,
  components      JSONB NOT NULL DEFAULT '[]',
  sale_price      NUMERIC DEFAULT 0,
  critical_limit  INTEGER DEFAULT 5,
  status          TEXT DEFAULT 'ACTIVE',

  -- Teknik alanlar
  material            TEXT,
  weight              TEXT,
  dimensions          TEXT,
  surface_treatment   TEXT,
  drawing_no          TEXT,
  standard            TEXT,
  notes               TEXT,

  -- İstatistik
  total_produced      INTEGER DEFAULT 0,
  last_produced_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS Politikaları
ALTER TABLE public.boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own BOMs"
  ON public.boms
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- İndeks
CREATE INDEX IF NOT EXISTS boms_user_id_idx ON public.boms(user_id);
