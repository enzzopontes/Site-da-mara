-- ============================================================================
-- Migration 031: Configuração Visual da Grade 3D da Home (Mobile & Desktop)
-- Tabela singleton sincronizada entre Admin, Site Público e App Mobile.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.home_grid_layout (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),

  -- Mobile (Site <640px e App Mobile)
  mobile_columns INTEGER NOT NULL DEFAULT 3 CHECK (mobile_columns BETWEEN 2 AND 4),
  mobile_card_padding INTEGER NOT NULL DEFAULT 12 CHECK (mobile_card_padding BETWEEN 4 AND 20),
  mobile_card_gap INTEGER NOT NULL DEFAULT 10 CHECK (mobile_card_gap BETWEEN 4 AND 16),
  mobile_icon_size INTEGER NOT NULL DEFAULT 52 CHECK (mobile_icon_size BETWEEN 28 AND 68),
  mobile_label_size INTEGER NOT NULL DEFAULT 12 CHECK (mobile_label_size BETWEEN 9 AND 14),

  -- Desktop (Site >=640px)
  desktop_columns INTEGER NOT NULL DEFAULT 6 CHECK (desktop_columns BETWEEN 3 AND 8),
  desktop_card_padding INTEGER NOT NULL DEFAULT 16 CHECK (desktop_card_padding BETWEEN 6 AND 24),
  desktop_card_gap INTEGER NOT NULL DEFAULT 16 CHECK (desktop_card_gap BETWEEN 6 AND 24),
  desktop_icon_size INTEGER NOT NULL DEFAULT 64 CHECK (desktop_icon_size BETWEEN 36 AND 80),
  desktop_label_size INTEGER NOT NULL DEFAULT 14 CHECK (desktop_label_size BETWEEN 11 AND 16),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_home_grid_layout_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_home_grid_layout_updated_at ON public.home_grid_layout;
CREATE TRIGGER trg_home_grid_layout_updated_at
  BEFORE UPDATE ON public.home_grid_layout
  FOR EACH ROW
  EXECUTE FUNCTION public.set_home_grid_layout_updated_at();

-- Seed do registro singleton com os padrões exatos da Home
INSERT INTO public.home_grid_layout (
  id,
  mobile_columns,
  mobile_card_padding,
  mobile_card_gap,
  mobile_icon_size,
  mobile_label_size,
  desktop_columns,
  desktop_card_padding,
  desktop_card_gap,
  desktop_icon_size,
  desktop_label_size
)
VALUES ('default', 3, 12, 10, 52, 12, 6, 16, 16, 64, 14)
ON CONFLICT (id) DO NOTHING;

-- Permissões e RLS
GRANT SELECT ON public.home_grid_layout TO anon, authenticated;
GRANT INSERT, UPDATE ON public.home_grid_layout TO authenticated;

ALTER TABLE public.home_grid_layout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_grid_layout_select_public" ON public.home_grid_layout;
CREATE POLICY "home_grid_layout_select_public"
  ON public.home_grid_layout
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "home_grid_layout_insert_admin" ON public.home_grid_layout;
CREATE POLICY "home_grid_layout_insert_admin"
  ON public.home_grid_layout
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "home_grid_layout_update_admin" ON public.home_grid_layout;
CREATE POLICY "home_grid_layout_update_admin"
  ON public.home_grid_layout
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Publicação no Supabase Realtime (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'home_grid_layout'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.home_grid_layout;
  END IF;
END $$;
