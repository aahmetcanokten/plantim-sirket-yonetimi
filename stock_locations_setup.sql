-- ============================================================
-- ÇOKLU DEPO STOK YÖNETİMİ - stock_locations tablosu
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- 1. stock_locations tablosunu oluştur
CREATE TABLE IF NOT EXISTS public.stock_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_product_warehouse UNIQUE (product_id, warehouse_name)
);

-- 2. RLS (Row Level Security) - kullanıcı sadece kendi verisini görür
ALTER TABLE public.stock_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own stock_locations"
  ON public.stock_locations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Index: hız için
CREATE INDEX IF NOT EXISTS idx_stock_locations_product_id ON public.stock_locations(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_user_id ON public.stock_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse_name ON public.stock_locations(warehouse_name);

-- 4. Mevcut products tablosundaki warehouseLocation verisini stock_locations'a aktar
-- (Eğer ürünlerin mevcut warehouseLocation tanımlıysa)
INSERT INTO public.stock_locations (user_id, product_id, warehouse_name, quantity)
SELECT 
  p.user_id,
  p.id AS product_id,
  COALESCE(p."warehouseLocation", 'Ana Depo') AS warehouse_name,
  COALESCE(p.quantity, 0) AS quantity
FROM public.products p
WHERE p.user_id IS NOT NULL
  AND COALESCE(p.quantity, 0) > 0
ON CONFLICT (product_id, warehouse_name) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      updated_at = now();

-- 5. updated_at otomatik güncelleme trigger
CREATE OR REPLACE FUNCTION update_stock_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stock_locations_updated_at ON public.stock_locations;
CREATE TRIGGER stock_locations_updated_at
  BEFORE UPDATE ON public.stock_locations
  FOR EACH ROW EXECUTE FUNCTION update_stock_locations_updated_at();

-- ============================================================
-- SONUÇ DOĞRULAMA
-- ============================================================
-- Aşağıdaki sorgu ile oluşturulan verileri kontrol edin:
-- SELECT p.name, sl.warehouse_name, sl.quantity 
-- FROM stock_locations sl 
-- JOIN products p ON p.id = sl.product_id 
-- ORDER BY p.name, sl.warehouse_name;
