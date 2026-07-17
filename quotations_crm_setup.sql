-- Teklifler (Quotations) tablosunu CRM modülüne dönüştürmek için gereken sütunların eklenmesi
-- Bu SQL kodunu Supabase projenizin SQL Editöründe çalıştırınız.

ALTER TABLE public.quotations 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS probability NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS assignee_id TEXT, -- Personnel ID is UUID or Text? Using TEXT for compatibility
ADD COLUMN IF NOT EXISTS next_follow_up DATE,
ADD COLUMN IF NOT EXISTS terms_conditions TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT;

-- Mevcut 'status' sütunu aynı kalacak ancak uygulama içinde durum yönetimi ve Kanban için ek durumlar desteklenecek.
-- Uygulama tarafındaki durumlar: DRAFT, SENT, NEGOTIATION, APPROVED, CONVERTED, REJECTED, CANCELLED
