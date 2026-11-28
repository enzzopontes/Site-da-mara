-- =============================================================================
-- Migration 036: Rate Limit Distribuído no Supabase PostgreSQL
-- =============================================================================
-- Objetivo:
--   Criar tabela public.rate_limit_buckets (RLS habilitado, sem políticas
--   públicas — acesso exclusivo service_role) e RPC atômica
--   public.check_rate_limit(p_key, p_limit, p_window_ms) com limpeza
--   oportunista de janelas expiradas.
--
-- Idempotente: seguro para múltiplas execuções.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_reset_at
  ON public.rate_limit_buckets (reset_at);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Nenhuma política pública: bloqueia anon e authenticated; acesso apenas service_role
REVOKE ALL ON TABLE public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limit_buckets TO service_role;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  reset_at_ms bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_limit integer := GREATEST(1, COALESCE(p_limit, 60));
  v_window_ms integer := GREATEST(1000, COALESCE(p_window_ms, 60000));
  v_new_reset timestamptz := v_now + (v_window_ms || ' milliseconds')::interval;
  v_count integer;
  v_reset_at timestamptz;
BEGIN
  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RAISE EXCEPTION 'p_key is required';
  END IF;

  -- Limpeza oportunista de buckets expirados (baixa sobrecarga)
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limit_buckets
    WHERE reset_at <= v_now - interval '5 minutes';
  END IF;

  INSERT INTO public.rate_limit_buckets AS b (bucket_key, count, reset_at)
  VALUES (left(p_key, 256), 1, v_new_reset)
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      count = CASE
        WHEN b.reset_at <= v_now THEN 1
        ELSE b.count + 1
      END,
      reset_at = CASE
        WHEN b.reset_at <= v_now THEN v_new_reset
        ELSE b.reset_at
      END
  RETURNING b.count, b.reset_at INTO v_count, v_reset_at;

  allowed := v_count <= v_limit;
  remaining := GREATEST(0, v_limit - v_count);
  reset_at_ms := FLOOR(EXTRACT(EPOCH FROM v_reset_at) * 1000)::bigint;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
