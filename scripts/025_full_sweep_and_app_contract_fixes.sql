-- 025_full_sweep_and_app_contract_fixes.sql
-- Bloco 1: NEW-01, NEW-03, NEW-09, NEW-13 (estorno de cupom no cancelamento admin), APP-10 (allowlist estrita em merge_order_metadata)

-- 1. NEW-01: Alinha protect_profiles_role para compatibilidade com OLD.role = 'user' sem permitir escalacao de privilegio
CREATE OR REPLACE FUNCTION public.protect_profiles_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       AND CURRENT_USER NOT IN ('postgres', 'supabase_admin')
       AND NOT public.is_admin() THEN
      IF NEW.role IS DISTINCT FROM 'user' AND NEW.role IS DISTINCT FROM 'customer' THEN
        NEW.role := 'user';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
         AND CURRENT_USER NOT IN ('postgres', 'supabase_admin')
         AND NOT public.is_admin() THEN
        IF COALESCE(OLD.role, 'user') IN ('user', 'customer') AND COALESCE(NEW.role, 'user') IN ('user', 'customer') THEN
          NEW.role := OLD.role;
          RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Acesso negado: nao e permitido alterar o proprio cargo (role).';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.protect_profiles_role() FROM PUBLIC, anon, authenticated;

-- 2. NEW-03: Trigger BEFORE DELETE em public.coupons para limpar vinculos em user_coupon_uses/free_coupons e desvincular home_banners
CREATE OR REPLACE FUNCTION public.unlink_coupon_refs_before_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  DELETE FROM public.user_coupon_uses WHERE coupon_id = OLD.id;
  DELETE FROM public.free_coupons WHERE coupon_id = OLD.id;
  UPDATE public.home_banners SET coupon_id = NULL WHERE coupon_id = OLD.id;
  RETURN OLD;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.unlink_coupon_refs_before_delete() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_unlink_coupon_refs_before_delete'
  ) THEN
    CREATE TRIGGER trg_unlink_coupon_refs_before_delete
      BEFORE DELETE ON public.coupons
      FOR EACH ROW
      EXECUTE FUNCTION public.unlink_coupon_refs_before_delete();
  END IF;
END;
$$;

-- 3. NEW-13 (suporte DB): RPC atomica para estornar uso de cupom quando admin cancela um pedido
CREATE OR REPLACE FUNCTION public.refund_coupon_on_order_cancel(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_rec record;
  v_refunded int := 0;
BEGIN
  IF v_jwt_role <> 'service_role'
     AND CURRENT_USER NOT IN ('postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;

  FOR v_rec IN
    DELETE FROM public.user_coupon_uses
     WHERE order_id = p_order_id
    RETURNING coupon_id
  LOOP
    UPDATE public.coupons
       SET current_uses = GREATEST(0, COALESCE(current_uses, 0) - 1),
           updated_at = now()
     WHERE id = v_rec.coupon_id;
    v_refunded := v_refunded + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'refunded_count', v_refunded);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refund_coupon_on_order_cancel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_coupon_on_order_cancel(uuid) TO authenticated, service_role;

-- 4. NEW-09: Corrige dispatch_admin_new_order_push substituindo coluna inexistente "phone" por "customer_phone"
CREATE OR REPLACE FUNCTION public.dispatch_admin_new_order_push(p_order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_order record;
  v_tokens text[];
  v_token text;
  v_messages jsonb := '[]'::jsonb;
  v_title text;
  v_subtitle text;
  v_body text;
  v_items text;
  v_order_label text;
  v_total text;
  v_delivery_type text;
  v_address text;
  v_payment text;
  v_phone text;
  v_req_id bigint;
BEGIN
  SELECT
    id, user_id, order_number, total_amount, payment_method, delivery_type,
    customer_address, customer_complement, customer_neighborhood,
    customer_name, customer_phone, notes, status, metadata
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  IF v_jwt_role <> 'service_role'
     AND CURRENT_USER NOT IN ('postgres', 'supabase_admin')
     AND NOT public.is_admin() THEN
    IF v_caller IS NULL OR v_order.user_id IS DISTINCT FROM v_caller THEN
      RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
    END IF;
  END IF;

  IF v_order.status = 'awaiting_payment' THEN
    RETURN jsonb_build_object('success', false, 'sent', false, 'reason', 'awaiting_payment');
  END IF;

  IF COALESCE((v_order.metadata->>'admin_push_sent')::boolean, false) IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'sent', false, 'reason', 'already_sent');
  END IF;

  SELECT array_agg(DISTINCT expo_push_token)
  INTO v_tokens
  FROM public.admin_push_tokens
  WHERE expo_push_token IS NOT NULL
    AND (expo_push_token LIKE 'ExponentPushToken[%' OR expo_push_token LIKE 'ExpoPushToken[%');

  IF v_tokens IS NULL OR array_length(v_tokens, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_admin_tokens_registered');
  END IF;

  UPDATE public.orders
  SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('admin_push_sent', true)
  WHERE id = p_order_id;

  v_order_label := COALESCE('#' || v_order.order_number::text, '#' || upper(right(p_order_id::text, 4)));
  v_total := 'R$ ' || trim(to_char(COALESCE(v_order.total_amount, 0), 'FM999990.00'));

  IF v_order.delivery_type IN ('retirada', 'pickup') THEN
    v_delivery_type := 'Retirada no Portão de Ferro Preto';
    v_address := 'Portão de Ferro Preto (Loja)';
  ELSE
    v_delivery_type := 'Entrega Delivery';
    v_address := COALESCE(v_order.customer_address, 'Endereço não informado')
      || CASE WHEN v_order.customer_complement IS NOT NULL AND v_order.customer_complement != '' THEN ' (' || v_order.customer_complement || ')' ELSE '' END
      || CASE WHEN v_order.customer_neighborhood IS NOT NULL AND v_order.customer_neighborhood != '' THEN ' - ' || v_order.customer_neighborhood ELSE '' END;
  END IF;

  v_payment := CASE
    WHEN v_order.payment_method = 'pix' THEN 'Pix'
    WHEN v_order.payment_method = 'dinheiro' THEN 'Dinheiro'
    ELSE 'Cartão'
  END;

  v_phone := COALESCE(v_order.customer_phone, '');

  SELECT string_agg(item_row, ' | ')
  INTO v_items
  FROM (
    SELECT quantity || 'x ' || COALESCE(product_name, 'Item') ||
      CASE
        WHEN adicionais IS NOT NULL AND jsonb_array_length(CASE WHEN jsonb_typeof(adicionais) = 'array' THEN adicionais ELSE '[]'::jsonb END) > 0
        THEN ' (+ ' || (
          SELECT string_agg(
            COALESCE(elem->>'name', elem->>'nome', elem#>>'{}'),
            ', '
          )
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(adicionais) = 'array' THEN adicionais ELSE '[]'::jsonb END) elem
        ) || ')'
        ELSE ''
      END AS item_row
    FROM public.order_items
    WHERE order_id = p_order_id
    LIMIT 8
  ) sub;

  IF v_items IS NULL OR v_items = '' THEN
    v_items := 'Itens no pedido';
  END IF;

  v_title := '🚨 NOVO PEDIDO ' || v_order_label || ' • ' || COALESCE(v_order.customer_name, 'Cliente');
  v_subtitle := COALESCE(v_order.customer_name, 'Cliente') || ' — ' || v_total;

  v_body := '💰 ' || v_total || ' (' || v_payment || ')' || E'\n'
         || '📦 ' || v_delivery_type || ' • ' || v_address || E'\n'
         || '🍽️ ' || v_items
         || CASE WHEN v_phone != '' THEN E'\n' || '📞 Tel: ' || v_phone ELSE '' END
         || CASE WHEN v_order.notes IS NOT NULL AND v_order.notes != '' THEN E'\n' || '📝 Obs: ' || v_order.notes ELSE '' END;

  FOREACH v_token IN ARRAY v_tokens LOOP
    v_messages := v_messages || jsonb_build_array(
      jsonb_build_object(
        'to', v_token,
        'sound', 'new_order.mp3',
        'channelId', 'new-orders',
        'priority', 'high',
        'title', v_title,
        'subtitle', v_subtitle,
        'body', v_body,
        'data', jsonb_build_object(
          'orderId', p_order_id,
          'screen', 'admin/pedidos',
          'url', '/admin/pedidos'
        )
      )
    );
  END LOOP;

  SELECT net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := v_messages,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  ) INTO v_req_id;

  RETURN jsonb_build_object(
    'success', true,
    'tokens_count', array_length(v_tokens, 1),
    'net_request_id', v_req_id
  );
END;
$function$;

-- 5. APP-10: Endurece merge_order_metadata substituindo denylist por ALLOWLIST ESTRITA para chamadas client-side
CREATE OR REPLACE FUNCTION public.merge_order_metadata(order_id uuid, patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_jwt_role text := COALESCE(current_setting('request.jwt.claim.role', true), '');
  v_order_user_id uuid;
  v_order_status text;
  v_clean_patch jsonb := '{}'::jsonb;
  v_result jsonb;
  v_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
BEGIN
  IF patch IS NULL OR jsonb_typeof(patch) <> 'object' THEN
    RAISE EXCEPTION 'patch must be a JSON object';
  END IF;

  SELECT o.user_id, o.status
  INTO v_order_user_id, v_order_status
  FROM public.orders o
  WHERE o.id = merge_order_metadata.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order % not found', order_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_jwt_role = 'service_role'
     OR CURRENT_USER IN ('postgres', 'supabase_admin')
     OR public.is_admin() THEN
    v_clean_patch := patch;
  ELSE
    IF v_caller IS NULL OR v_order_user_id IS DISTINCT FROM v_caller THEN
      RAISE EXCEPTION 'Not authorized to update metadata for order %', order_id
        USING ERRCODE = '42501';
    END IF;

    IF v_order_status NOT IN ('pending', 'awaiting_payment') THEN
      RAISE EXCEPTION 'Not allowed to modify metadata in current order status'
        USING ERRCODE = '42501';
    END IF;

    IF patch ? 'troco' AND COALESCE(patch->>'troco', '') <> '' THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('troco', left(patch->>'troco', 30));
    END IF;
    IF patch ? 'cep' AND COALESCE(patch->>'cep', '') <> '' THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('cep', left(patch->>'cep', 12));
    END IF;
    IF patch ? 'reference_point' AND COALESCE(patch->>'reference_point', '') <> '' THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('reference_point', left(patch->>'reference_point', 200));
    END IF;
    IF patch ? 'address_id' AND COALESCE(patch->>'address_id', '') ~ v_re THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('address_id', patch->>'address_id');
    END IF;
    IF patch ? 'card_last_four' AND COALESCE(patch->>'card_last_four', '') ~ '^[0-9]{4}$' THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('card_last_four', patch->>'card_last_four');
    END IF;
    IF patch ? 'installments' AND COALESCE(patch->>'installments', '') ~ '^[0-9]{1,2}$' THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('installments', (patch->>'installments')::int);
    END IF;
    IF patch ? 'source' AND (patch->>'source') IN ('app', 'site') THEN
      v_clean_patch := v_clean_patch || jsonb_build_object('source', patch->>'source');
    END IF;
  END IF;

  UPDATE public.orders o
  SET
    metadata = COALESCE(o.metadata, '{}'::jsonb) || v_clean_patch,
    updated_at = now()
  WHERE o.id = merge_order_metadata.order_id
  RETURNING o.metadata INTO v_result;

  RETURN v_result;
END;
$function$;
