-- ============================================================================
-- SCRIPT 021: Correção de Foreign Key e Deleção de Pedidos (user_coupon_uses)
-- Batata Top Delivery - Previne erro de violação de chave estrangeira ao deletar pedido
-- ============================================================================

-- 1. Se a foreign key user_coupon_uses_order_id_fkey existir, atualizar para ON DELETE CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_coupon_uses_order_id_fkey' 
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_coupon_uses DROP CONSTRAINT user_coupon_uses_order_id_fkey;
    ALTER TABLE public.user_coupon_uses 
      ADD CONSTRAINT user_coupon_uses_order_id_fkey 
      FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;

  -- 2. Conceder permissão RLS para administradores excluírem em user_coupon_uses (caso RLS esteja ativo)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'user_coupon_uses'
  ) THEN
    ALTER TABLE public.user_coupon_uses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admins can delete user_coupon_uses" ON public.user_coupon_uses;
    CREATE POLICY "Admins can delete user_coupon_uses"
      ON public.user_coupon_uses FOR DELETE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
      );
  END IF;
END $$;

-- 3. Atualizar a RPC delete_order_admin para remover user_coupon_uses com segurança
CREATE OR REPLACE FUNCTION public.delete_order_admin(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar se quem está chamando é admin
  SELECT (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
  ) INTO v_is_admin;

  IF NOT COALESCE(v_is_admin, FALSE) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir pedidos permanentemente.';
  END IF;

  -- Deletar registros vinculados em user_coupon_uses se a tabela existir
  BEGIN
    DELETE FROM public.user_coupon_uses WHERE order_id = p_order_id;
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  -- Deletar itens do pedido primeiro (garantia caso cascade falhe)
  DELETE FROM public.order_items WHERE order_id = p_order_id;
  
  -- Deletar o pedido
  DELETE FROM public.orders WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_order_admin(UUID) TO authenticated;
