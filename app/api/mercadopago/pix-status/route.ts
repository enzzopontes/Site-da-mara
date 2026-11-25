import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequestUser } from '@/lib/supabase/route-auth';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Configuração do servidor ausente' }, { status: 500 });
    }

    const user = await authenticateRequestUser(req, supabase);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }

    const rawOrderId = req.nextUrl.searchParams.get('orderId');
    const rawPaymentId =
      req.nextUrl.searchParams.get('paymentId') ||
      req.nextUrl.searchParams.get('id');

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    // SEC-04 FIX: Valida posse do pedido no banco ANTES de consultar a API do Mercado Pago
    let ownedOrder: { id: string; user_id: string; status: string; metadata: any } | null = null;
    let targetPaymentId: string | null = null;

    const candidateOrderId =
      rawOrderId && uuidRegex.test(rawOrderId)
        ? rawOrderId
        : rawPaymentId && uuidRegex.test(rawPaymentId)
        ? rawPaymentId
        : null;

    if (candidateOrderId) {
      const { data: ord, error: ordErr } = await supabase
        .from('orders')
        .select('id, user_id, status, metadata')
        .eq('id', candidateOrderId)
        .maybeSingle();

      if (ordErr || !ord || ord.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }
      ownedOrder = ord;
      const recordedPixId = ord.metadata?.pix?.payment_id || ord.metadata?.mp_payment_id;
      if (rawPaymentId && !uuidRegex.test(rawPaymentId)) {
        if (recordedPixId && String(recordedPixId) !== String(rawPaymentId)) {
          return NextResponse.json({ success: false, error: 'Pagamento não corresponde ao pedido' }, { status: 403 });
        }
        targetPaymentId = rawPaymentId;
      } else if (recordedPixId) {
        targetPaymentId = String(recordedPixId);
      }
    } else if (rawPaymentId && /^[a-zA-Z0-9_-]{1,64}$/.test(rawPaymentId)) {
      const { data: userOrders, error: listErr } = await supabase
        .from('orders')
        .select('id, user_id, status, metadata')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (listErr || !userOrders) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }

      ownedOrder =
        userOrders.find(
          (o: any) =>
            String(o.metadata?.pix?.payment_id || '') === rawPaymentId ||
            String(o.metadata?.mp_payment_id || '') === rawPaymentId
        ) || null;

      if (!ownedOrder) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }
      targetPaymentId = rawPaymentId;
    } else {
      return NextResponse.json({ success: false, error: 'id do pagamento inválido ou ausente' }, { status: 400 });
    }

    if (!targetPaymentId || !/^[a-zA-Z0-9_-]{1,64}$/.test(targetPaymentId)) {
      return NextResponse.json({ success: false, error: 'id do pagamento inválido ou ausente' }, { status: 400 });
    }

    // Consulta na API de pagamentos (/v1/payments)
    let mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${targetPaymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      const externalRef = data.external_reference;

      if (!externalRef || externalRef !== ownedOrder.id) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }

      // SEC-02 FIX: Usa exclusivamente apply_payment_result e respeita seu retorno/retencoes antifraude
      if (data.status === 'approved' || data.status_detail === 'accredited') {
        if (ownedOrder.status === 'awaiting_payment' || ownedOrder.status === 'pending') {
          const { data: applyResult, error: applyError } = await supabase.rpc('apply_payment_result', {
            p_order_id: ownedOrder.id,
            p_payment_id: String(data.id || targetPaymentId),
            p_mp_status: 'approved',
            p_amount: Number(data.transaction_amount || 0),
            p_status_detail: data.status_detail || null,
          });

          if (applyError) {
            console.error('[pix-status] Erro em apply_payment_result:', applyError.message);
            return NextResponse.json(
              { success: false, error: 'Erro ao sincronizar status do pagamento' },
              { status: 500 }
            );
          }

          if (applyResult?.action === 'held_underpaid') {
            return NextResponse.json(
              {
                success: false,
                error: 'Valor pago diverge do total do pedido. Pagamento retido para revisão.',
                action: applyResult.action,
              },
              { status: 409 }
            );
          }
        }
      }

      return NextResponse.json({
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
        paymentStatus: data.status,
        paymentStatusDetail: data.status_detail,
        dateOfExpiration: data.date_of_expiration,
      });
    }

    // Fallback para orders legadas (/v1/orders)
    mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${targetPaymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      const externalRef = data.external_reference;

      if (!externalRef || externalRef !== ownedOrder.id) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }

      const payment = data.transactions?.payments?.[0];
      return NextResponse.json({
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
        paymentStatus: payment?.status,
        paymentStatusDetail: payment?.status_detail,
      });
    }

    const data = await mpRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        success: false,
        error: data.message || 'Erro ao consultar status do pagamento',
      },
      { status: mpRes.status || 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Erro de conexão com o Mercado Pago' },
      { status: 500 }
    );
  }
}
