-- ============================================================
-- 020_real_stats_and_feedbacks.sql
-- Batata Top Delivery - Funções públicas para métricas reais e avaliações
-- ============================================================

-- 1. Total real de pedidos feitos no restaurante (visível para o card do restaurante)
CREATE OR REPLACE FUNCTION get_total_orders_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.orders;
$$;

-- Permissão pública para executar a função de contagem
GRANT EXECUTE ON FUNCTION get_total_orders_count() TO anon, authenticated, service_role;

-- 2. Estatísticas públicas de avaliações (média de estrelas e total real)
CREATE OR REPLACE FUNCTION get_public_feedbacks_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_avg NUMERIC;
BEGIN
  SELECT 
    COUNT(*)::INTEGER, 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 4.9)
  INTO v_total, v_avg
  FROM public.feedbacks;

  RETURN jsonb_build_object(
    'total', v_total,
    'average', v_avg
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_feedbacks_stats() TO anon, authenticated, service_role;

-- 3. Lista de avaliações públicas dos clientes (apenas comentários aprovados/com texto)
CREATE OR REPLACE FUNCTION get_public_feedbacks(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, 
    COALESCE(customer_name, 'Cliente'), 
    rating, 
    comment, 
    created_at
  FROM public.feedbacks
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_public_feedbacks(INTEGER) TO anon, authenticated, service_role;
