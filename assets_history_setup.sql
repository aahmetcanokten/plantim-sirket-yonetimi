-- assets tablosuna geçmiş zimmet bilgisini tutmak için past_assignments JSONB sütunu ekliyoruz
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS past_assignments JSONB DEFAULT '[]'::jsonb;
