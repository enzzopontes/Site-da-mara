-- ============================================================
-- 016_lock_orders_direct_insert.sql
-- Batata Top Delivery - Bloqueio de inserção direta em orders/order_items
-- Garante que clientes comuns não possam criar pedidos diretamente via REST,
-- forçando o uso da RPC segura create_order() (SECURITY DEFINER), que valida
-- preços, cupons e estoque no backend.
-- ============================================================

-- 1. Dropar políticas que permitiam inserção direta por usuários comuns
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Only admins or service role can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Only admins or service role can insert order items" ON public.order_items;

-- 2. Permitir inserção direta apenas para admins (ou service_role/SECURITY DEFINER que bypassa RLS)
-- Comentário: Pedidos de clientes comuns DEVEM ser feitos exclusivamente através
-- da RPC create_order(), que executa com SECURITY DEFINER e recalcula os valores
-- com segurança a partir dos preços reais dos produtos cadastrados no banco.
CREATE POLICY "Only admins or service role can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins or service role can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
