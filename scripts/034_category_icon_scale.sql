-- ============================================================================
-- Migration 034: Escala individual permanente de ícones 3D de categoria
-- Adiciona icon_scale (60 a 150, padrão 100) em public.categories para
-- ajuste visual não-destrutivo sincronizado entre Site e App.
-- ============================================================================

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon_scale integer NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_icon_scale_check'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_icon_scale_check
      CHECK (icon_scale >= 60 AND icon_scale <= 150);
  END IF;
END $$;
