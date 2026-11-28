-- =============================================================================
-- Migration 035: Unificação de Políticas RLS Admin para public.is_admin()
-- =============================================================================
-- Objetivo:
--   1. Endurecer public.is_admin() (SECURITY DEFINER, search_path fixo em
--      public, pg_catalog, exigindo auth.uid() IS NOT NULL e checando
--      profiles.role = 'admin' ou app_metadata.role = 'admin', sem e-mails
--      hardcoded).
--   2. Substituir todas as 19 políticas RLS legadas no schema public que
--      continham e-mails literais hardcoded (auth.jwt() ->> 'email') via
--      ALTER POLICY atômico apontando para public.is_admin().
--
-- Idempotente: seguro para múltiplas execuções (CREATE OR REPLACE + checks).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('adicionais',       'Admins can delete adicionais',         'USING'),
      ('adicionais',       'Admins can insert adicionais',         'CHECK'),
      ('adicionais',       'Admins can manage adicionais',         'BOTH'),
      ('adicionais',       'Admins can update adicionais',         'BOTH'),
      ('coupons',          'Admins can manage coupons',            'BOTH'),
      ('feedbacks',        'Admins can delete feedbacks',          'USING'),
      ('feedbacks',        'Admins can view all feedbacks',        'USING'),
      ('home_banners',     'Admins can manage home_banners',       'BOTH'),
      ('media_metadata',   'Admins can delete media_metadata',     'USING'),
      ('media_metadata',   'Admins can insert media_metadata',     'CHECK'),
      ('media_metadata',   'Admins can update media_metadata',     'BOTH'),
      ('order_items',      'Admins can delete order items',        'USING'),
      ('orders',           'Admins can delete orders',             'USING'),
      ('products',         'Admins can delete products',           'USING'),
      ('products',         'Admins can insert products',           'CHECK'),
      ('products',         'Admins can update products',           'BOTH'),
      ('store_settings',   'Admins can manage store_settings',     'BOTH'),
      ('uploaded_images',  'Admins can manage uploaded images',    'BOTH'),
      ('user_coupon_uses', 'Admins can delete user_coupon_uses',   'USING')
    ) AS t(tbl, pol, mode)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = rec.tbl
        AND policyname = rec.pol
    ) THEN
      IF rec.mode = 'USING' THEN
        EXECUTE format(
          'ALTER POLICY %I ON public.%I USING (public.is_admin())',
          rec.pol, rec.tbl
        );
      ELSIF rec.mode = 'CHECK' THEN
        EXECUTE format(
          'ALTER POLICY %I ON public.%I WITH CHECK (public.is_admin())',
          rec.pol, rec.tbl
        );
      ELSE
        EXECUTE format(
          'ALTER POLICY %I ON public.%I USING (public.is_admin()) WITH CHECK (public.is_admin())',
          rec.pol, rec.tbl
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
