-- ============================================================================
-- Migration 033: Visibilidade independente por perfil na Grade 3D da Home
-- Adiciona show_on_home_bar_mobile, show_on_home_bar_desktop e show_on_home_bar_app
-- em public.categories preservando o valor atual de show_on_home_bar.
-- ============================================================================

DO $$
DECLARE
  v_had_profile_columns BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'show_on_home_bar_mobile'
  ) INTO v_had_profile_columns;

  ALTER TABLE public.categories
    ADD COLUMN IF NOT EXISTS show_on_home_bar_mobile BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_on_home_bar_desktop BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_on_home_bar_app BOOLEAN NOT NULL DEFAULT true;

  -- Backfill idempotente na transição inicial a partir de show_on_home_bar
  IF NOT v_had_profile_columns THEN
    UPDATE public.categories
    SET
      show_on_home_bar_mobile = show_on_home_bar,
      show_on_home_bar_desktop = show_on_home_bar,
      show_on_home_bar_app = show_on_home_bar;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_home_bar_profiles
  ON public.categories (
    show_on_home_bar_mobile,
    show_on_home_bar_desktop,
    show_on_home_bar_app,
    home_bar_order
  );

-- Mantém show_on_home_bar sincronizado atomicamente com os 3 perfis
CREATE OR REPLACE FUNCTION public.sync_category_home_bar_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.show_on_home_bar := (
    COALESCE(NEW.show_on_home_bar_mobile, false)
    OR COALESCE(NEW.show_on_home_bar_desktop, false)
    OR COALESCE(NEW.show_on_home_bar_app, false)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_categories_sync_home_bar
  BEFORE INSERT OR UPDATE OF show_on_home_bar_mobile, show_on_home_bar_desktop, show_on_home_bar_app
  ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_category_home_bar_flag();
