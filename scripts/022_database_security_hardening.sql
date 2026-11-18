-- ============================================================================
-- SCRIPT 022: Database Security Hardening & Zero-Trust Defense
-- Batata Top Delivery - Isolamento estrito de search_path, RLS e funções RPC
-- ============================================================================

-- 1. Garantir RLS habilitado em TODAS as tabelas públicas existentes
DO $$
DECLARE
  v_table text;
  v_tables text[] := ARRAY[
    'profiles', 'orders', 'order_items', 'products', 'adicionais', 
    'product_adicionais', 'coupons', 'addresses', 'store_settings', 
    'wait_time_state', 'home_banners', 'feedbacks', 'loyalty_rewards', 
    'user_coupon_uses', 'admin_push_tokens', 'payment_cards', 'uploaded_images'
  ];
BEGIN
  FOREACH v_table IN ARRAY v_tables
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', v_table);
    END IF;
  END LOOP;
END $$;

-- 2. Hardening de search_path e permissões em process_order_loyalty
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_order_loyalty') THEN
    ALTER FUNCTION public.process_order_loyalty(UUID) SET search_path = public, pg_temp;
    REVOKE ALL ON FUNCTION public.process_order_loyalty(UUID) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.process_order_loyalty(UUID) FROM anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.process_order_loyalty(UUID) TO service_role;
  END IF;
END $$;

-- 3. Hardening de search_path em funções de métricas e estatísticas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_total_orders_count') THEN
    ALTER FUNCTION public.get_total_orders_count() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_public_feedbacks_stats') THEN
    ALTER FUNCTION public.get_public_feedbacks_stats() SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_public_feedbacks') THEN
    ALTER FUNCTION public.get_public_feedbacks(INTEGER) SET search_path = public, pg_temp;
  END IF;
END $$;

-- 4. Hardening da tabela de Avaliações (feedbacks)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feedbacks') THEN
    -- Garante constraints de integridade no rating
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage 
      WHERE table_schema = 'public' AND table_name = 'feedbacks' AND constraint_name = 'feedbacks_rating_check'
    ) THEN
      ALTER TABLE public.feedbacks 
        DROP CONSTRAINT IF EXISTS feedbacks_rating_check,
        ADD CONSTRAINT feedbacks_rating_check CHECK (rating >= 1 AND rating <= 5);
    END IF;

    -- RLS: Bloqueia UPDATE e DELETE para usuários comuns; apenas admin pode gerenciar
    DROP POLICY IF EXISTS "Admins can manage feedbacks" ON public.feedbacks;
    CREATE POLICY "Admins can manage feedbacks" ON public.feedbacks 
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      );
  END IF;
END $$;

-- 5. Hardening da tabela de Recompensas de Fidelidade (loyalty_rewards)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_rewards') THEN
    -- Usuários não podem inserir recompensas diretamente (apenas RPC process_order_loyalty ou Admin)
    DROP POLICY IF EXISTS "Usuários podem criar recompensas" ON public.loyalty_rewards;
    DROP POLICY IF EXISTS "Admins can manage loyalty_rewards" ON public.loyalty_rewards;
    
    CREATE POLICY "Admins can manage loyalty_rewards" ON public.loyalty_rewards
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      );
  END IF;
END $$;

-- 6. Hardening de Store Settings e Wait Time (Apenas leitura pública; escrita exclusiva admin)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'store_settings') THEN
    DROP POLICY IF EXISTS "Anyone can update store settings" ON public.store_settings;
    DROP POLICY IF EXISTS "Admins only write store settings" ON public.store_settings;
    CREATE POLICY "Admins only write store settings" ON public.store_settings
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wait_time_state') THEN
    DROP POLICY IF EXISTS "Anyone can update wait time" ON public.wait_time_state;
    DROP POLICY IF EXISTS "Admins only write wait time" ON public.wait_time_state;
    CREATE POLICY "Admins only write wait time" ON public.wait_time_state
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      );
  END IF;
END $$;

-- 7. Hardening da RPC cancel_order_user (Garante sanitização e search_path seguro)
CREATE OR REPLACE FUNCTION public.cancel_order_user(
  p_order_id UUID,
  p_cancel_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order RECORD;
  v_caller_id UUID := auth.uid();
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se é admin
  SELECT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller_id AND role = 'admin')
    OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
  ) INTO v_is_admin;

  -- Selecionar pedido com lock
  SELECT id, user_id, status INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado.');
  END IF;

  -- Usuário comum só pode cancelar seu próprio pedido e apenas se estiver pendente
  IF NOT COALESCE(v_is_admin, FALSE) THEN
    IF v_order.user_id IS DISTINCT FROM v_caller_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permissão negada.');
    END IF;

    IF v_order.status NOT IN ('pending', 'awaiting_payment') THEN
      RETURN jsonb_build_object('success', false, 'error', 'O pedido já está em preparo ou concluído e não pode ser cancelado pelo cliente.');
    END IF;
  END IF;

  -- Atualiza status para cancelled
  UPDATE public.orders
  SET 
    status = 'cancelled',
    notes = CASE 
      WHEN p_cancel_reason IS NOT NULL AND length(trim(p_cancel_reason)) > 0 
      THEN COALESCE(notes, '') || ' [Cancelamento: ' || substr(trim(p_cancel_reason), 1, 150) || ']'
      ELSE notes
    END,
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'status', 'cancelled');
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_order_user(UUID, TEXT) TO authenticated;
