-- 019_create_loyalty_system.sql
-- Sistema de Fidelidade Batata Top: "10 Pedidos = 1 Batata Grátis"

-- 1. Adicionar colunas de rastreio de fidelidade na tabela profiles (se existir)
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS loyalty_orders_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_rewards_claimed INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loyalty_last_reward_at TIMESTAMP WITH TIME ZONE;

-- 2. Tabela de histórico de ciclos e recompensas de fidelidade
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  reward_type TEXT NOT NULL DEFAULT 'free_batata',
  coupon_code TEXT,
  claimed BOOLEAN NOT NULL DEFAULT false,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver suas próprias recompensas"
  ON loyalty_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar resgate da recompensa"
  ON loyalty_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Data de corte para contabilização (somente pedidos criados a partir desta data)
-- Marca na tabela orders se o pedido já pontuou na fidelidade para garantir idempotência
ALTER TABLE IF EXISTS orders
  ADD COLUMN IF NOT EXISTS loyalty_counted BOOLEAN NOT NULL DEFAULT false;

-- 4. Função RPC segura para incrementar fidelidade ao entregar pedido
CREATE OR REPLACE FUNCTION process_order_loyalty(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_current_count INTEGER;
  v_new_count INTEGER;
  v_reward_unlocked BOOLEAN := false;
  v_coupon_code TEXT := NULL;
BEGIN
  -- Busca pedido com lock
  SELECT id, user_id, status, loyalty_counted, created_at
  INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;

  -- Regra: Apenas pedidos de usuários cadastrados e ainda não contabilizados
  IF v_order.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido sem usuário associado');
  END IF;

  IF v_order.loyalty_counted = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido já contabilizado no programa de fidelidade');
  END IF;

  -- Apenas status entregue/concluído pontua
  IF v_order.status NOT IN ('delivered', 'concluído', 'concluido') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Status não elegível para pontuar');
  END IF;

  -- Busca contagem atual do perfil
  SELECT COALESCE(loyalty_orders_count, 0)
  INTO v_current_count
  FROM profiles
  WHERE id = v_order.user_id;

  v_new_count := v_current_count + 1;

  -- Marca pedido como contabilizado
  UPDATE orders
  SET loyalty_counted = true
  WHERE id = p_order_id;

  -- Verifica se atingiu 10 pedidos (gatilho de recompensa)
  IF v_new_count >= 10 THEN
    v_reward_unlocked := true;
    v_coupon_code := 'FIDELIDADE-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

    -- Registra recompensa liberada
    INSERT INTO loyalty_rewards (user_id, reward_type, coupon_code, claimed)
    VALUES (v_order.user_id, 'free_batata', v_coupon_code, false);

    -- Atualiza perfil (mantém 10 para o usuário ver o botão de resgate; zera após resgatar)
    UPDATE profiles
    SET loyalty_orders_count = 10,
        updated_at = NOW()
    WHERE id = v_order.user_id;
  ELSE
    UPDATE profiles
    SET loyalty_orders_count = v_new_count,
        updated_at = NOW()
    WHERE id = v_order.user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'new_count', v_new_count,
    'reward_unlocked', v_reward_unlocked,
    'coupon_code', v_coupon_code
  );
END;
$$;
