-- ============================================================================
-- SCRIPT 026: Tabela media_metadata e normalização de category em uploaded_images
-- Batata Top Delivery - Metadados de mídia com RLS idempotente
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA MEDIA_METADATA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.media_metadata (
  storage_path TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('product', 'promo', 'brand', 'general')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_metadata_category
ON public.media_metadata (category);

ALTER TABLE public.media_metadata ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.media_metadata TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_metadata TO authenticated;

DROP POLICY IF EXISTS "Anyone can view media_metadata" ON public.media_metadata;
CREATE POLICY "Anyone can view media_metadata"
ON public.media_metadata FOR SELECT TO public
USING (true);

DROP POLICY IF EXISTS "Admins can insert media_metadata" ON public.media_metadata;
CREATE POLICY "Admins can insert media_metadata"
ON public.media_metadata FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR lower(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
);

DROP POLICY IF EXISTS "Admins can update media_metadata" ON public.media_metadata;
CREATE POLICY "Admins can update media_metadata"
ON public.media_metadata FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR lower(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR lower(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
);

DROP POLICY IF EXISTS "Admins can delete media_metadata" ON public.media_metadata;
CREATE POLICY "Admins can delete media_metadata"
ON public.media_metadata FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR lower(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
);

-- ----------------------------------------------------------------------------
-- 2. TABELA LEGADA UPLOADED_IMAGES (criada fora de scripts/)
-- Alinha a CHECK constraint da coluna category de forma idempotente caso exista
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uploaded_images'
      AND column_name = 'category'
  ) THEN
    FOR constraint_rec IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'uploaded_images'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%category%'
    LOOP
      EXECUTE format(
        'ALTER TABLE public.uploaded_images DROP CONSTRAINT IF EXISTS %I',
        constraint_rec.conname
      );
    END LOOP;

    EXECUTE 'UPDATE public.uploaded_images SET category = ''general'' WHERE category IS NULL OR category NOT IN (''product'', ''promo'', ''brand'', ''general'')';

    ALTER TABLE public.uploaded_images
      ADD CONSTRAINT uploaded_images_category_check
      CHECK (category IN ('product', 'promo', 'brand', 'general'));
  END IF;
END $$;
