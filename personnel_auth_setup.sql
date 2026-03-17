-- ============================================================
-- PERSONEL GİRİŞİ - YETKİLENDİRME VE RLS GÜNCELLEMESİ
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- 1. Personel Kullanıcıları Tablosu
-- (Auth id ile Admin id'yi eşleştirir)
CREATE TABLE IF NOT EXISTS public.personnel_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'PERSONNEL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for personnel_users
ALTER TABLE public.personnel_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage their personnel"
  ON public.personnel_users
  FOR ALL
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Personnel can read their own record"
  ON public.personnel_users
  FOR SELECT
  USING (user_id = auth.uid());

-- 2. get_admin_id() Fonksiyonu
-- (Kullanıcının Admin ID'sini bulur, personel değilse kendi ID'sini döndürür)
CREATE OR REPLACE FUNCTION public.get_admin_id() RETURNS uuid AS $$
DECLARE
  admin_uuid uuid;
BEGIN
  SELECT admin_id INTO admin_uuid 
  FROM public.personnel_users 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1;
  
  IF admin_uuid IS NOT NULL THEN
    RETURN admin_uuid;
  ELSE
    RETURN auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ana Tablolara Personel Erişim Poliçeleri Eklenmesi
-- Mevcut kuralları (auth.uid() = user_id) silmeden, ek bir kural ile personellerin
-- bağlı oldukları Admin verilerine erişmeleri sağlanır.

DO $$
DECLARE
  app_table TEXT;
  tables_array TEXT[] := ARRAY[
    'customers', 'products', 'sales', 'personnel', 'vehicles', 
    'purchases', 'user_profiles', 'companies', 'work_orders', 
    'process_templates', 'maintenance_requests', 'quotations', 
    'warehouse_transfers', 'stock_locations', 'boms', 
    'finance_transactions', 'budgets', 'personnel_leave_history', 'assets'
  ];
BEGIN
  FOREACH app_table IN ARRAY tables_array
  LOOP
    -- Sadece tablo gerçekten veritabanında varsa işlem yap
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = app_table) THEN
      
      -- Önce eski bir Personnel Access poliçesi varsa temizle (tekrar çalıştırılabilir olması için)
      EXECUTE format('DROP POLICY IF EXISTS "Personnel Access Policy" ON public.%I', app_table);
      
      -- Yeni poliçeyi ekle
      EXECUTE format(
        'CREATE POLICY "Personnel Access Policy" ON public.%I FOR ALL USING (user_id = public.get_admin_id()) WITH CHECK (user_id = public.get_admin_id())',
        app_table
      );
      
      RAISE NOTICE 'Policy created for table: %', app_table;
    END IF;
  END LOOP;
END
$$;
