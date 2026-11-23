-- 024_audit_security_and_checkout_fixes.sql
-- Correcoes de Banco de Dados (Bloco 1): BUG-01, BUG-02, BUG-03, BUG-06, BUG-07, SEC-03, SEC-05

-- 1. BUG-02: Remove trigger redundante/conflitante trg_handle_coupon_on_order e torna a funcao segura/idempotente
DROP TRIGGER IF EXISTS trg_handle_coupon_on_order ON public.orders;

CREATE OR REPLACE FUNCTION public.handle_coupon_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_coupon coupons%ROWTYPE;
  v_user_uses INT;
  v_gross_subtotal numeric;
  v_inserted INT := 0;
BEGIN
  IF NEW.coupon_code IS NULL OR NEW.status = 'awaiting_payment' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_coupon FROM public.coupons WHERE upper(code) = upper(NEW.coupon_code) FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cupom % não existe', NEW.coupon_code;
  END IF;

  IF NOT v_coupon.active THEN
    RAISE EXCEPTION 'Cupom % está inativo', NEW.coupon_code;
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RAISE EXCEPTION 'Cupom % expirado', NEW.coupon_code;
  END IF;

  IF v_coupon.max_uses IS NOT NULL AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses THEN
    RAISE EXCEPTION 'Cupom % esgotado', NEW.coupon_code;
  END IF;

  v_gross_subtotal := COALESCE((NEW.metadata->>'subtotal')::numeric, NEW.total_amount + COALESCE(NEW.discount_amount, 0));
  IF v_coupon.min_order_value IS NOT NULL AND NOT public.coupon_min_order_met(v_gross_subtotal, v_coupon.min_order_value) THEN
    RAISE EXCEPTION 'Pedido não atinge o valor mínimo do cupom %', NEW.coupon_code;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_coupon_uses WHERE order_id = NEW.id AND coupon_id = v_coupon.id) THEN
    RETURN NEW;
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL AND NEW.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.user_coupon_uses
    WHERE user_id = NEW.user_id AND coupon_id = v_coupon.id;

    IF v_user_uses >= v_coupon.max_uses_per_user THEN
      RAISE EXCEPTION 'Usuário já atingiu o limite de uso do cupom %', NEW.coupon_code;
    END IF;
  END IF;

  INSERT INTO public.user_coupon_uses (user_id, coupon_id, order_id, used_at)
  VALUES (NEW.user_id, v_coupon.id, NEW.id, now())
  ON CONFLICT (order_id, coupon_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted > 0 THEN
    UPDATE public.coupons SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = v_coupon.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. BUG-03: Ajusta FK order_items_product_id_fkey para ON DELETE SET NULL + trigger BEFORE DELETE em public.products
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.unlink_order_items_before_product_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.order_items
     SET product_id = NULL
   WHERE product_id = OLD.id;
  RETURN OLD;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.unlink_order_items_before_product_delete() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_unlink_order_items_before_product_delete'
  ) THEN
    CREATE TRIGGER trg_unlink_order_items_before_product_delete
      BEFORE DELETE ON public.products
      FOR EACH ROW
      EXECUTE FUNCTION public.unlink_order_items_before_product_delete();
  END IF;
END;
$$;

-- 3. BUG-06: Policies explicitas is_admin() de escrita em public.product_adicionais
DROP POLICY IF EXISTS product_adicionais_admin_insert ON public.product_adicionais;
CREATE POLICY product_adicionais_admin_insert
  ON public.product_adicionais
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS product_adicionais_admin_update ON public.product_adicionais;
CREATE POLICY product_adicionais_admin_update
  ON public.product_adicionais
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS product_adicionais_admin_delete ON public.product_adicionais;
CREATE POLICY product_adicionais_admin_delete
  ON public.product_adicionais
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 4. SEC-05: Policies em storage.objects para os buckets existentes e revogacao de EXECUTE anon
DROP POLICY IF EXISTS storage_objects_public_read ON storage.objects;
CREATE POLICY storage_objects_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id IN ('Products', 'logo', 'coupon-banners'));

DROP POLICY IF EXISTS storage_objects_admin_insert ON storage.objects;
CREATE POLICY storage_objects_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('Products', 'logo', 'coupon-banners') AND public.is_admin());

DROP POLICY IF EXISTS storage_objects_admin_update ON storage.objects;
CREATE POLICY storage_objects_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('Products', 'logo', 'coupon-banners') AND public.is_admin())
  WITH CHECK (bucket_id IN ('Products', 'logo', 'coupon-banners') AND public.is_admin());

DROP POLICY IF EXISTS storage_objects_admin_delete ON storage.objects;
CREATE POLICY storage_objects_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('Products', 'logo', 'coupon-banners') AND public.is_admin());

REVOKE EXECUTE ON FUNCTION public.delete_order_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_order_admin(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.protect_profiles_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

-- 5. BUG-01, BUG-07, SEC-03: Atualiza public.create_order (v_addon_id::text, MIN_ORDER_VALUE, first_order, promo rule, allowlist de p_metadata)
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_neighborhood text,
  p_customer_complement text,
  p_delivery_type text,
  p_payment_method text,
  p_payment_online boolean,
  p_coupon_code text,
  p_notes text,
  p_wants_cutlery boolean,
  p_metadata jsonb,
  p_items jsonb
)
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
  v_prior_orders int;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_total numeric;
  v_status text;
  v_number int;
  v_today date;
  v_order_id uuid;
  v_safe_input_meta jsonb := '{}'::jsonb;
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
          SELECT id, name, price, available INTO v_adic FROM public.adicionais WHERE id = v_addon_id::text;
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

  IF round(coalesce(v_subtotal, 0) * 100) < 2000 THEN
    RAISE EXCEPTION 'min_order_value_not_met';
  END IF;

  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    IF v_item_promo OR v_super_on OR v_legacy_on THEN
      RAISE EXCEPTION 'coupon_blocked_by_active_promo';
    END IF;

    SELECT * INTO v_coupon FROM public.coupons WHERE upper(code) = upper(btrim(p_coupon_code)) FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
    IF v_coupon.active IS NOT TRUE THEN RAISE EXCEPTION 'coupon_inactive'; END IF;
    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN RAISE EXCEPTION 'coupon_expired'; END IF;
    IF v_coupon.max_uses IS NOT NULL AND COALESCE(v_coupon.current_uses, 0) >= v_coupon.max_uses THEN RAISE EXCEPTION 'coupon_max_uses_reached'; END IF;

    IF COALESCE(v_coupon.template_origin, '') = 'first_order' OR upper(v_coupon.code) LIKE 'BEMVINDO%' THEN
      SELECT count(*) INTO v_prior_orders FROM public.orders WHERE user_id = v_uid AND status <> 'cancelled';
      IF v_prior_orders > 0 THEN
        RAISE EXCEPTION 'coupon_first_order_only';
      END IF;
    END IF;

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

  IF p_metadata IS NOT NULL AND jsonb_typeof(p_metadata) = 'object' THEN
    IF COALESCE(p_metadata->>'troco', '') <> '' THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('troco', left(p_metadata->>'troco', 30));
    END IF;
    IF (p_metadata->>'installments') ~ '^[0-9]{1,2}$' THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('installments', (p_metadata->>'installments')::int);
    END IF;
    IF COALESCE(p_metadata->>'saved_card_id', '') ~ v_re THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('saved_card_id', p_metadata->>'saved_card_id');
    END IF;
    IF (p_metadata->>'card_last_four') ~ '^[0-9]{4}$' THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('card_last_four', p_metadata->>'card_last_four');
    END IF;
    IF COALESCE(p_metadata->>'address_id', '') ~ v_re THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('address_id', p_metadata->>'address_id');
    END IF;
    IF COALESCE(p_metadata->>'reference_point', '') <> '' THEN
      v_safe_input_meta := v_safe_input_meta || jsonb_build_object('reference_point', left(p_metadata->>'reference_point', 200));
    END IF;
  END IF;

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

-- 6. SEC-03: Reserva e finalizacao atomicas (FOR UPDATE) de tentativas de pagamento com cartao (limite max 5)
CREATE OR REPLACE FUNCTION public.reserve_card_payment_attempt(
  p_order_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order record;
  v_payments jsonb;
  v_count int;
  v_attempt int;
  v_entry jsonb;
BEGIN
  SELECT id, user_id, status, payment_method, total_amount, metadata
    INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found', 'http_status', 404);
  END IF;

  IF v_order.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden', 'http_status', 403);
  END IF;

  IF v_order.status <> 'awaiting_payment' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_status_not_payable', 'http_status', 409);
  END IF;

  IF v_order.payment_method <> 'cartao' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payment_method_mismatch', 'http_status', 400);
  END IF;

  v_payments := CASE
    WHEN jsonb_typeof(v_order.metadata->'card_payments') = 'array' THEN v_order.metadata->'card_payments'
    ELSE '[]'::jsonb
  END;
  v_count := jsonb_array_length(v_payments);

  IF v_count >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Limite de tentativas de cartão excedido (máx 5)', 'http_status', 429);
  END IF;

  v_attempt := v_count + 1;
  v_entry := jsonb_build_object(
    'attempt_number', v_attempt,
    'payment_id', NULL,
    'status', 'reserved',
    'status_detail', 'in_flight',
    'reserved_at', now()
  );

  UPDATE public.orders
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('card_payments', v_payments || jsonb_build_array(v_entry)),
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'attempt_number', v_attempt,
    'total_amount', v_order.total_amount,
    'card_type', v_order.metadata->>'card_type'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reserve_card_payment_attempt(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_card_payment_attempt(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_card_payment_attempt(
  p_order_id uuid,
  p_attempt_number int,
  p_payment_id text,
  p_status text,
  p_status_detail text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_meta jsonb;
  v_payments jsonb;
  v_updated jsonb := '[]'::jsonb;
  v_elem jsonb;
  v_found boolean := false;
BEGIN
  SELECT COALESCE(metadata, '{}'::jsonb)
    INTO v_meta
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_not_found');
  END IF;

  v_payments := CASE
    WHEN jsonb_typeof(v_meta->'card_payments') = 'array' THEN v_meta->'card_payments'
    ELSE '[]'::jsonb
  END;

  FOR v_elem IN SELECT e FROM jsonb_array_elements(v_payments) e LOOP
    IF (v_elem->>'attempt_number')::int = p_attempt_number THEN
      v_updated := v_updated || jsonb_build_array(
        jsonb_build_object(
          'attempt_number', p_attempt_number,
          'payment_id', p_payment_id,
          'status', p_status,
          'status_detail', p_status_detail,
          'updated_at', now()
        )
      );
      v_found := true;
    ELSE
      v_updated := v_updated || jsonb_build_array(v_elem);
    END IF;
  END LOOP;

  IF NOT v_found THEN
    v_updated := v_updated || jsonb_build_array(
      jsonb_build_object(
        'attempt_number', p_attempt_number,
        'payment_id', p_payment_id,
        'status', p_status,
        'status_detail', p_status_detail,
        'updated_at', now()
      )
    );
  END IF;

  UPDATE public.orders
     SET metadata = v_meta || jsonb_build_object('card_payments', v_updated),
         updated_at = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('ok', true, 'card_payments', v_updated);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.finalize_card_payment_attempt(uuid, int, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_card_payment_attempt(uuid, int, text, text, text) TO service_role;
