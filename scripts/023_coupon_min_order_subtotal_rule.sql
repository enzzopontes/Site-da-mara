-- 023_coupon_min_order_subtotal_rule.sql
-- Regra oficial do valor mínimo de cupom (espelha lib/coupon-rules.ts):
--   * Base: SUBTOTAL BRUTO DOS ITENS (antes de qualquer desconto, SEM taxa de entrega).
--   * Comparação em centavos inteiros (evita erro de ponto flutuante).
--   * Cupom abaixo do mínimo = PENDENTE: o pedido NÃO falha; o desconto é 0.
--
-- Esta migration cria o helper coupon_min_order_met e atualiza public.create_order
-- (corpo copiado da função em produção; só o bloco de cupom mudou).
-- Aplicar no SQL Editor do Supabase. Idempotente (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION public.coupon_min_order_met(
  p_items_subtotal numeric,
  p_min_order_value numeric
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT round(coalesce(p_items_subtotal, 0) * 100)
         >= round(coalesce(p_min_order_value, 0) * 100);
$$;

COMMENT ON FUNCTION public.coupon_min_order_met(numeric, numeric) IS
  'Mínimo de cupom atendido? Compara subtotal bruto dos itens (sem frete/desconto) em centavos.';

GRANT EXECUTE ON FUNCTION public.coupon_min_order_met(numeric, numeric) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- create_order: cupom abaixo do mínimo vira PENDENTE (sem erro, desconto 0).
-- Única mudança em relação à versão em produção: o bloco de cupom.
--   * antes: RAISE EXCEPTION 'coupon_min_order_value_not_met'
--   * agora: v_coupon_pending := true; cupom ignorado (sem desconto, sem coupon_code,
--            sem consumo de uso). Mínimo comparado em centavos via coupon_min_order_met().
-- Demais validações do cupom (inativo, expirado, esgotado, limite por usuário) continuam
-- lançando exceção, como antes. CREATE OR REPLACE preserva os GRANTs existentes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order(p_customer_name text, p_customer_phone text, p_customer_address text, p_customer_neighborhood text, p_customer_complement text, p_delivery_type text, p_payment_method text, p_payment_online boolean, p_coupon_code text, p_notes text, p_wants_cutlery boolean, p_metadata jsonb, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_store jsonb;
  v_fee numeric := 0;
  v_item_promo boolean := false;
  v_super_on boolean := false;
  v_super_price numeric;
  v_legacy_on boolean := false;
  v_legacy_price numeric := 24.99;
  v_promos jsonb := '[]'::jsonb;
  v_cnt int;
  v_item jsonb;
  v_prod record;
  v_qty int;
  v_price numeric;
  v_promo numeric;
  v_addon jsonb;
  v_addon_id uuid;
  v_addon_name text;
  v_addon_qty int;
  v_adic record;
  v_addons_sum numeric;
  v_addons_json jsonb;
  v_item_total numeric;
  v_subtotal numeric := 0;
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  v_has_coupon boolean := false;
  v_coupon_pending boolean := false;
  v_coupon record;
  v_coupon_id uuid;
  v_coupon_code text;
  v_uses int;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_status text;
  v_number int;
  v_today date;
  v_order_id uuid;
  v_safe_input_meta jsonb;
  v_meta jsonb;
  v_online boolean := COALESCE(p_payment_online, false);
  v_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_del_lat double precision;
  v_del_lng double precision;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  IF p_customer_name IS NULL OR length(btrim(p_customer_name)) = 0 OR length(p_customer_name) > 120 THEN RAISE EXCEPTION 'invalid_customer_name'; END IF;
  IF p_customer_phone IS NULL OR length(btrim(p_customer_phone)) = 0 OR length(p_customer_phone) > 30 THEN RAISE EXCEPTION 'invalid_customer_phone'; END IF;
  IF length(COALESCE(p_customer_address, '')) > 300 OR length(COALESCE(p_customer_neighborhood, '')) > 300 OR length(COALESCE(p_customer_complement, '')) > 300 THEN RAISE EXCEPTION 'address_too_long'; END IF;
  IF length(COALESCE(p_notes, '')) > 500 THEN RAISE EXCEPTION 'notes_too_long'; END IF;
  IF p_delivery_type IS NULL OR p_delivery_type NOT IN ('delivery', 'retirada', 'pickup') THEN RAISE EXCEPTION 'invalid_delivery_type'; END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('dinheiro', 'pix', 'cartao') THEN RAISE EXCEPTION 'invalid_payment_method'; END IF;
  IF v_online AND p_payment_method = 'dinheiro' THEN RAISE EXCEPTION 'online_requires_pix_or_card'; END IF;

  SELECT setting_value INTO v_store FROM public.store_settings WHERE setting_key = 'store_status';
  IF v_store IS NOT NULL THEN
    IF COALESCE((v_store->>'isOpen')::boolean, true) IS NOT TRUE THEN RAISE EXCEPTION 'store_is_closed'; END IF;
    IF p_delivery_type = 'delivery' THEN
      IF COALESCE((v_store->>'isDeliveryEnabled')::boolean, true) IS NOT TRUE THEN RAISE EXCEPTION 'delivery_disabled'; END IF;
      IF COALESCE((v_store->>'isDeliveryFeeEnabled')::boolean, false) IS TRUE THEN
        v_fee := COALESCE((v_store->>'deliveryFee')::numeric, 3.00);
      END IF;
    END IF;
    v_item_promo := COALESCE((v_store->'itemPromo'->>'isActive')::boolean, false);
    v_super_on := COALESCE((v_store->'superPromo'->>'isActive')::boolean, false);
    v_super_price := (v_store->'superPromo'->>'price')::numeric;
    v_legacy_on := COALESCE((v_store->>'isPromoActive')::boolean, false);
    v_legacy_price := COALESCE((v_store->>'promoPrice')::numeric, 24.99);
    IF jsonb_typeof(v_store->'promoProducts') = 'array' THEN v_promos := v_store->'promoProducts'; END IF;
  END IF;

  SELECT count(*) INTO v_cnt FROM public.orders WHERE user_id = v_uid AND status = 'awaiting_payment';
  IF v_cnt >= 3 THEN RAISE EXCEPTION 'too_many_awaiting_orders'; END IF;
  SELECT count(*) INTO v_cnt FROM public.orders WHERE user_id = v_uid AND created_at > now() - interval '10 minutes';
  IF v_cnt >= 5 THEN RAISE EXCEPTION 'rate_limit_exceeded'; END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  FOR v_item IN SELECT e FROM jsonb_array_elements(p_items) e LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN RAISE EXCEPTION 'invalid_items'; END IF;
    IF COALESCE(v_item->>'product_id', '') !~ v_re THEN RAISE EXCEPTION 'invalid_product_id'; END IF;
    v_qty := CASE WHEN (v_item->>'quantity') ~ '^[0-9]{1,3}$' THEN (v_item->>'quantity')::int ELSE NULL END;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN RAISE EXCEPTION 'invalid_item_quantity'; END IF;
    IF length(COALESCE(v_item->>'pasta_type', '')) > 50 THEN RAISE EXCEPTION 'pasta_type_too_long'; END IF;
    IF length(COALESCE(v_item->>'notes', '')) > 500 THEN RAISE EXCEPTION 'item_notes_too_long'; END IF;

    SELECT id, name, price, category, available INTO v_prod FROM public.products WHERE id = (v_item->>'product_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
    IF v_prod.available IS NOT TRUE THEN RAISE EXCEPTION 'product_unavailable'; END IF;

    v_price := v_prod.price;
    IF v_item_promo THEN
      v_promo := (SELECT (e->>'promoPrice')::numeric FROM jsonb_array_elements(v_promos) e WHERE e->>'productId' = v_prod.id::text LIMIT 1);
      v_price := COALESCE(v_promo, v_price);
    ELSIF v_super_on AND v_prod.category = 'batata' AND v_super_price IS NOT NULL THEN
      v_price := v_super_price;
    ELSIF v_legacy_on THEN
      v_promo := (SELECT (e->>'promoPrice')::numeric FROM jsonb_array_elements(v_promos) e WHERE e->>'productId' = v_prod.id::text LIMIT 1);
      IF v_promo IS NOT NULL THEN v_price := v_promo;
      ELSIF v_prod.category = 'batata' THEN v_price := v_legacy_price;
      END IF;
    END IF;

    v_addons_sum := 0;
    v_addons_json := '[]'::jsonb;
    IF jsonb_typeof(v_item->'adicionais') = 'array' THEN
      IF jsonb_array_length(v_item->'adicionais') > 20 THEN RAISE EXCEPTION 'too_many_addons'; END IF;
      FOR v_addon IN SELECT a FROM jsonb_array_elements(v_item->'adicionais') a LOOP
        v_addon_id := NULL; v_addon_name := NULL; v_addon_qty := 1;
        IF jsonb_typeof(v_addon) = 'object' THEN
          IF COALESCE(v_addon->>'id', '') <> '' THEN
            IF v_addon->>'id' !~ v_re THEN RAISE EXCEPTION 'invalid_addon_id'; END IF;
            v_addon_id := (v_addon->>'id')::uuid;
          END IF;
          v_addon_name := btrim(COALESCE(v_addon->>'name', ''));
          IF v_addon ? 'quantity' THEN
            v_addon_qty := CASE WHEN (v_addon->>'quantity') ~ '^[0-9]{1,3}$' THEN (v_addon->>'quantity')::int ELSE NULL END;
          END IF;
        ELSIF jsonb_typeof(v_addon) = 'string' THEN
          v_addon_name := btrim(v_addon #>> '{}');
        ELSE
          RAISE EXCEPTION 'invalid_addon';
        END IF;
        IF v_addon_qty IS NULL OR v_addon_qty < 1 OR v_addon_qty > 99 THEN RAISE EXCEPTION 'invalid_addon_quantity'; END IF;
        IF v_addon_id IS NOT NULL THEN
          SELECT id, name, price, available INTO v_adic FROM public.adicionais WHERE id = v_addon_id;
        ELSIF v_addon_name <> '' THEN
          SELECT id, name, price, available INTO v_adic FROM public.adicionais WHERE upper(name) = upper(v_addon_name) LIMIT 1;
        ELSE
          RAISE EXCEPTION 'invalid_addon';
        END IF;
        IF NOT FOUND THEN RAISE EXCEPTION 'addon_not_found'; END IF;
        IF v_adic.available IS NOT TRUE THEN RAISE EXCEPTION 'addon_unavailable'; END IF;
        v_addons_sum := v_addons_sum + v_adic.price * v_addon_qty;
        v_addons_json := v_addons_json || jsonb_build_array(jsonb_build_object('id', v_adic.id, 'name', v_adic.name, 'price', v_adic.price, 'quantity', v_addon_qty));
      END LOOP;
    END IF;

    v_item_total := round((v_price + v_addons_sum) * v_qty, 2);
    v_subtotal := v_subtotal + v_item_total;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object(
      'product_id', v_prod.id, 'product_name', v_prod.name, 'product_price', v_price, 'quantity', v_qty,
      'notes', v_item->>'notes', 'pasta_type', v_item->>'pasta_type', 'adicionais', v_addons_json,
      'category', v_prod.category, 'item_total', v_item_total));
  END LOOP;

  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon FROM public.coupons WHERE upper(code) = upper(btrim(p_coupon_code)) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
    IF v_coupon.active IS NOT TRUE THEN RAISE EXCEPTION 'coupon_inactive'; END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN RAISE EXCEPTION 'coupon_expired'; END IF;
    IF v_coupon.max_uses IS NOT NULL AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses THEN RAISE EXCEPTION 'coupon_max_uses_reached'; END IF;

    -- Regra oficial: mínimo vs subtotal bruto dos itens (sem frete/desconto), em centavos.
    -- Abaixo do mínimo = PENDENTE: pedido segue sem desconto e sem erro.
    IF v_coupon.min_order_value IS NOT NULL
       AND NOT public.coupon_min_order_met(v_subtotal, v_coupon.min_order_value) THEN
      v_coupon_pending := true;
    END IF;

    IF NOT v_coupon_pending THEN
      IF v_coupon.max_uses_per_user IS NOT NULL THEN
        SELECT count(*) INTO v_uses FROM public.user_coupon_uses WHERE user_id = v_uid AND coupon_id = v_coupon.id;
        IF v_uses >= v_coupon.max_uses_per_user THEN RAISE EXCEPTION 'coupon_user_limit_reached'; END IF;
      END IF;
      IF v_coupon.restricted_categories IS NOT NULL AND COALESCE(array_length(v_coupon.restricted_categories, 1), 0) > 0 THEN
        SELECT COALESCE(sum((r->>'item_total')::numeric), 0) INTO v_eligible
          FROM jsonb_array_elements(v_rows) r WHERE (r->>'category') = ANY (v_coupon.restricted_categories);
        IF v_eligible <= 0 THEN RAISE EXCEPTION 'coupon_not_applicable'; END IF;
      ELSE
        v_eligible := v_subtotal;
      END IF;
      IF v_coupon.discount_type = 'percentage' THEN
        v_discount := round(v_eligible * (v_coupon.discount_value / 100.0), 2);
      ELSIF v_coupon.discount_type = 'fixed' THEN
        v_discount := least(v_coupon.discount_value, v_eligible);
      ELSE
        RAISE EXCEPTION 'coupon_type_unsupported';
      END IF;
      v_has_coupon := true; v_coupon_id := v_coupon.id; v_coupon_code := v_coupon.code;
    END IF;
  END IF;

  v_total := greatest(0, v_subtotal - v_discount + v_fee);
  IF v_online AND v_total <= 0 THEN RAISE EXCEPTION 'online_total_must_be_positive'; END IF;
  v_status := CASE WHEN v_online THEN 'awaiting_payment' ELSE 'pending' END;

  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  PERFORM pg_advisory_xact_lock(hashtext('order_number_' || v_today::text));
  SELECT COALESCE(max(order_number), 0) + 1 INTO v_number FROM public.orders
   WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = v_today;

  -- Sanitiza p_metadata recebido do cliente para impedir injeção de chaves sensíveis
  v_safe_input_meta := COALESCE(p_metadata, '{}'::jsonb)
    - 'paid_at'
    - 'payment_status'
    - 'mp_payment_status'
    - 'pix'
    - 'status'
    - 'refunded'
    - 'admin_push_sent'
    - 'auto_delivered_by_mara'
    - 'delivered_at'
    - 'dispatched_at'
    - 'arrived_at';

  v_meta := v_safe_input_meta || jsonb_build_object(
    'source', CASE WHEN p_metadata->>'source' IN ('app', 'site') THEN p_metadata->>'source' ELSE 'app' END,
    'payment_online', v_online, 'subtotal', v_subtotal, 'delivery_fee', v_fee);
  IF p_metadata->>'card_type' IN ('credit', 'debit') THEN v_meta := v_meta || jsonb_build_object('card_type', p_metadata->>'card_type'); END IF;
  IF COALESCE(p_metadata->>'cep', '') <> '' THEN v_meta := v_meta || jsonb_build_object('cep', left(p_metadata->>'cep', 12)); END IF;

  IF (p_metadata->>'delivery_lat') IS NOT NULL AND (p_metadata->>'delivery_lat') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    v_del_lat := (p_metadata->>'delivery_lat')::double precision;
  ELSE
    v_del_lat := NULL;
  END IF;

  IF (p_metadata->>'delivery_lng') IS NOT NULL AND (p_metadata->>'delivery_lng') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    v_del_lng := (p_metadata->>'delivery_lng')::double precision;
  ELSE
    v_del_lng := NULL;
  END IF;

  INSERT INTO public.orders (user_id, customer_name, customer_phone, customer_address, customer_neighborhood, customer_complement,
    payment_method, total_amount, discount_amount, coupon_code, status, notes, delivery_type, order_number, wants_cutlery, metadata, delivery_lat, delivery_lng)
  VALUES (v_uid, btrim(p_customer_name), btrim(p_customer_phone), COALESCE(p_customer_address, ''), COALESCE(p_customer_neighborhood, ''),
    NULLIF(p_customer_complement, ''), p_payment_method, v_total, v_discount,
    CASE WHEN v_has_coupon THEN v_coupon_code ELSE NULL END, v_status, NULLIF(p_notes, ''), p_delivery_type, v_number,
    COALESCE(p_wants_cutlery, false), v_meta, v_del_lat, v_del_lng)
  RETURNING id INTO v_order_id;

  FOR v_row IN SELECT r FROM jsonb_array_elements(v_rows) r LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, product_price, quantity, notes, adicionais, pasta_type)
    VALUES (v_order_id, (v_row->>'product_id')::uuid, v_row->>'product_name', (v_row->>'product_price')::numeric,
      (v_row->>'quantity')::int, v_row->>'notes', v_row->'adicionais', v_row->>'pasta_type');
  END LOOP;

  IF NOT v_online THEN
    PERFORM public.increment_wait_time_sql();
    UPDATE public.orders SET metadata = metadata || jsonb_build_object('queued', true) WHERE id = v_order_id;
    IF v_has_coupon THEN PERFORM public.confirm_coupon_use(v_order_id); END IF;
  END IF;

  RETURN jsonb_build_object('order_id', v_order_id, 'order_number', v_number, 'status', v_status,
    'total_amount', v_total, 'discount_amount', v_discount, 'delivery_fee', v_fee, 'subtotal', v_subtotal,
    'coupon_applied', v_has_coupon, 'coupon_pending', v_coupon_pending);
END;
$function$;
