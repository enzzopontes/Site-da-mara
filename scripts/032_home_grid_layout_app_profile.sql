-- ============================================================================
-- Migration 032: Perfil independente do App + border-radius proporcional
-- Evolução segura e idempotente de public.home_grid_layout.
-- ============================================================================

DO $$
DECLARE
  v_had_app_columns BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'home_grid_layout'
      AND column_name = 'app_columns'
  ) INTO v_had_app_columns;

  ALTER TABLE public.home_grid_layout
    ADD COLUMN IF NOT EXISTS mobile_card_radius INTEGER NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS desktop_card_radius INTEGER NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS app_columns INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS app_card_padding INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS app_card_gap INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS app_icon_size INTEGER NOT NULL DEFAULT 52,
    ADD COLUMN IF NOT EXISTS app_label_size INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS app_card_radius INTEGER NOT NULL DEFAULT 16;

  -- Backfill idempotente do registro 'default': copia mobile_* -> app_* apenas
  -- na transição inicial (quando app_* ainda não existia).
  IF NOT v_had_app_columns THEN
    UPDATE public.home_grid_layout
    SET
      app_columns = mobile_columns,
      app_card_padding = mobile_card_padding,
      app_card_gap = mobile_card_gap,
      app_icon_size = mobile_icon_size,
      app_label_size = mobile_label_size,
      app_card_radius = mobile_card_radius
    WHERE id = 'default';
  END IF;

  -- Constraints CHECK idempotentes com paridade exata ao Zod e normalizeHomeGridLayout
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_mobile_card_radius_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_mobile_card_radius_check CHECK (mobile_card_radius BETWEEN 8 AND 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_desktop_card_radius_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_desktop_card_radius_check CHECK (desktop_card_radius BETWEEN 8 AND 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_columns_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_columns_check CHECK (app_columns BETWEEN 2 AND 4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_card_padding_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_card_padding_check CHECK (app_card_padding BETWEEN 4 AND 20);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_card_gap_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_card_gap_check CHECK (app_card_gap BETWEEN 4 AND 16);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_icon_size_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_icon_size_check CHECK (app_icon_size BETWEEN 28 AND 68);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_label_size_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_label_size_check CHECK (app_label_size BETWEEN 9 AND 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'home_grid_layout_app_card_radius_check') THEN
    ALTER TABLE public.home_grid_layout
      ADD CONSTRAINT home_grid_layout_app_card_radius_check CHECK (app_card_radius BETWEEN 8 AND 24);
  END IF;
END $$;

-- Garante existência do registro singleton 'default'
INSERT INTO public.home_grid_layout (
  id,
  mobile_columns,
  mobile_card_padding,
  mobile_card_gap,
  mobile_icon_size,
  mobile_label_size,
  mobile_card_radius,
  desktop_columns,
  desktop_card_padding,
  desktop_card_gap,
  desktop_icon_size,
  desktop_label_size,
  desktop_card_radius,
  app_columns,
  app_card_padding,
  app_card_gap,
  app_icon_size,
  app_label_size,
  app_card_radius
)
VALUES ('default', 3, 12, 10, 52, 12, 16, 6, 16, 16, 64, 14, 16, 3, 12, 10, 52, 12, 16)
ON CONFLICT (id) DO NOTHING;

-- Garante permissões e RLS ativos (idempotente)
GRANT SELECT ON public.home_grid_layout TO anon, authenticated;
GRANT INSERT, UPDATE ON public.home_grid_layout TO authenticated;

ALTER TABLE public.home_grid_layout ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'home_grid_layout' AND policyname = 'home_grid_layout_select_public'
  ) THEN
    CREATE POLICY "home_grid_layout_select_public"
      ON public.home_grid_layout
      FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'home_grid_layout' AND policyname = 'home_grid_layout_insert_admin'
  ) THEN
    CREATE POLICY "home_grid_layout_insert_admin"
      ON public.home_grid_layout
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'home_grid_layout' AND policyname = 'home_grid_layout_update_admin'
  ) THEN
    CREATE POLICY "home_grid_layout_update_admin"
      ON public.home_grid_layout
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;

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
