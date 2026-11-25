-- ============================================================================
-- Migration 030: Dynamic Categories & Home Showcase System
-- Idempotent migration for Site-da-mara & Batatop-app (shared Supabase DB)
-- ============================================================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'product_category'
    CHECK (kind IN ('product_category', 'home_shortcut')),

  -- Media & Visual
  icon_url TEXT,
  icon_type TEXT NOT NULL DEFAULT 'preset_3d'
    CHECK (icon_type IN ('upload', 'preset_3d', 'lucide')),
  fallback_icon TEXT NOT NULL DEFAULT 'UtensilsCrossed',
  accent_color TEXT NOT NULL DEFAULT '#E3A008',
  badge_text TEXT,
  badge_color TEXT DEFAULT '#C1440E',

  -- Custom link (for home_shortcut items)
  custom_href TEXT,

  -- Independent visibility & ordering
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_on_home_bar BOOLEAN NOT NULL DEFAULT true,
  home_bar_order INTEGER NOT NULL DEFAULT 0,
  show_on_home_featured BOOLEAN NOT NULL DEFAULT false,
  home_featured_order INTEGER NOT NULL DEFAULT 0,
  home_featured_limit INTEGER NOT NULL DEFAULT 6
    CHECK (home_featured_limit >= 1 AND home_featured_limit <= 24),
  show_on_menu BOOLEAN NOT NULL DEFAULT true,
  menu_order INTEGER NOT NULL DEFAULT 0,
  menu_layout_zone TEXT NOT NULL DEFAULT 'main'
    CHECK (menu_layout_zone IN ('main', 'sidebar_right')),

  -- Business rules
  allows_addons BOOLEAN NOT NULL DEFAULT true,
  allows_notes BOOLEAN NOT NULL DEFAULT true,
  show_ranking BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for storefront & admin ordering queries
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_kind_active ON public.categories (kind, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_home_bar ON public.categories (show_on_home_bar, home_bar_order);
CREATE INDEX IF NOT EXISTS idx_categories_home_featured ON public.categories (show_on_home_featured, home_featured_order);
CREATE INDEX IF NOT EXISTS idx_categories_menu ON public.categories (show_on_menu, menu_order);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_categories_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_categories_updated_at();

-- 2. Seed initial backward-compatible categories & home shortcuts
INSERT INTO public.categories (
  slug, name, description, kind,
  icon_url, icon_type, fallback_icon, accent_color,
  badge_text, badge_color, custom_href,
  is_active,
  show_on_home_bar, home_bar_order,
  show_on_home_featured, home_featured_order, home_featured_limit,
  show_on_menu, menu_order, menu_layout_zone,
  allows_addons, allows_notes, show_ranking
)
VALUES
  (
    'cardapio', 'Cardápio', 'Veja todas as opções do nosso cardápio', 'home_shortcut',
    '/assets/icones3d/icone cardapio.png', 'preset_3d', 'BookOpen', '#E3A008',
    NULL, '#C1440E', '/cardapio',
    true,
    true, 0,
    false, 10, 6,
    false, 10, 'main',
    false, false, false
  ),
  (
    'batata', 'Batatas', 'As queridinhas de Iacanga, recheadas na medida certa com muito sabor', 'product_category',
    '/assets/icones3d/icone batata.png', 'preset_3d', 'Flame', '#E3A008',
    NULL, '#C1440E', NULL,
    true,
    true, 1,
    true, 0, 8,
    true, 0, 'main',
    true, true, true
  ),
  (
    'macarrao', 'Macarrão', 'Macarrão artesanal preparado na hora com molhos especiais e queijo derretido', 'product_category',
    '/assets/icones3d/icone macarrao.png', 'preset_3d', 'Utensils', '#C1440E',
    NULL, '#C1440E', NULL,
    true,
    true, 2,
    true, 1, 4,
    true, 1, 'main',
    true, true, true
  ),
  (
    'bebida', 'Bebidas', 'Bebidas bem geladas para acompanhar seu pedido', 'product_category',
    '/assets/icones3d/icone bebidas geladas.png', 'preset_3d', 'CupSoda', '#0284C7',
    NULL, '#C1440E', NULL,
    true,
    true, 3,
    false, 2, 6,
    true, 2, 'sidebar_right',
    false, false, false
  ),
  (
    'cupons', 'Cupons', 'Descontos exclusivos para o seu pedido', 'home_shortcut',
    '/assets/icones3d/icone cupom.png', 'preset_3d', 'Ticket', '#C1440E',
    NULL, '#C1440E', '/cupons',
    true,
    true, 4,
    false, 11, 6,
    false, 11, 'main',
    false, false, false
  ),
  (
    'todos', 'Ver mais', 'Explorar o cardápio completo', 'home_shortcut',
    '/assets/icones3d/iconetodos.png', 'preset_3d', 'LayoutGrid', '#E3A008',
    NULL, '#C1440E', '/cardapio',
    true,
    true, 5,
    false, 12, 6,
    false, 12, 'main',
    false, false, false
  )
ON CONFLICT (slug) DO NOTHING;

-- 3. Add backward-compatible category_id FK on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_id_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id)
      REFERENCES public.categories(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);

-- Backfill existing products safely (exact slug match + plural legacy normalization)
UPDATE public.products p
SET category_id = c.id
FROM public.categories c
WHERE p.category_id IS NULL
  AND (
    lower(trim(p.category)) = c.slug
    OR (lower(trim(p.category)) = 'batatas' AND c.slug = 'batata')
    OR (lower(trim(p.category)) = 'bebidas' AND c.slug = 'bebida')
    OR (lower(trim(p.category)) IN ('macarrão', 'macarroes', 'massas') AND c.slug = 'macarrao')
  );

-- Trigger to keep products.category_id and legacy products.category slug in sync
CREATE OR REPLACE FUNCTION public.sync_product_category_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_cat_id UUID;
BEGIN
  -- If category_id was explicitly provided (on INSERT or changed on UPDATE), sync slug from category_id
  IF NEW.category_id IS NOT NULL AND (
    TG_OP = 'INSERT'
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.category IS NULL
    OR trim(NEW.category) = ''
  ) THEN
    SELECT slug INTO v_slug FROM public.categories WHERE id = NEW.category_id;
    IF v_slug IS NOT NULL THEN
      NEW.category := v_slug;
    END IF;
  ELSIF NEW.category IS NOT NULL AND trim(NEW.category) <> '' THEN
    -- Legacy write using only category slug: resolve category_id automatically
    SELECT id, slug INTO v_cat_id, v_slug
    FROM public.categories
    WHERE slug = lower(trim(NEW.category))
       OR (lower(trim(NEW.category)) = 'batatas' AND slug = 'batata')
       OR (lower(trim(NEW.category)) = 'bebidas' AND slug = 'bebida')
    LIMIT 1;

    IF v_cat_id IS NOT NULL THEN
      NEW.category_id := v_cat_id;
      NEW.category := v_slug;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_category_fields ON public.products;
CREATE TRIGGER trg_sync_product_category_fields
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_category_fields();

-- 4. RLS policies for public.categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_categories" ON public.categories;
CREATE POLICY "public_read_categories"
  ON public.categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_insert_categories" ON public.categories;
CREATE POLICY "admin_insert_categories"
  ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_categories" ON public.categories;
CREATE POLICY "admin_update_categories"
  ON public.categories
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_categories" ON public.categories;
CREATE POLICY "admin_delete_categories"
  ON public.categories
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 5. Supabase Storage bucket: category-icons (public read, admin write, 2MB, image MIME only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-icons',
  'category-icons',
  true,
  2097152,
  ARRAY['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "category_icons_public_read" ON storage.objects;
CREATE POLICY "category_icons_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'category-icons');

DROP POLICY IF EXISTS "category_icons_admin_insert" ON storage.objects;
CREATE POLICY "category_icons_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'category-icons' AND public.is_admin());

DROP POLICY IF EXISTS "category_icons_admin_update" ON storage.objects;
CREATE POLICY "category_icons_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'category-icons' AND public.is_admin())
  WITH CHECK (bucket_id = 'category-icons' AND public.is_admin());

DROP POLICY IF EXISTS "category_icons_admin_delete" ON storage.objects;
CREATE POLICY "category_icons_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'category-icons' AND public.is_admin());

-- 6. Enable Supabase Realtime on public.categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
END $$;
