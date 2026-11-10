-- ============================================================================
-- SCRIPT 018: Permissão para Administradores Excluírem Pedidos Permanentemente
-- Batata Top Delivery - Políticas RLS e RPC para DELETE em orders e order_items
-- ============================================================================

-- 1. Políticas RLS para exclusão direta na tabela orders
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
);

-- 2. Políticas RLS para exclusão direta na tabela order_items
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;
CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  OR LOWER(auth.jwt() ->> 'email') IN ('enzzobaraldo2008@gmail.com', 'maraysis9010@gmail.com')
);

-- 3. Função RPC segura (SECURITY DEFINER) para exclusão atômica de pedido
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
