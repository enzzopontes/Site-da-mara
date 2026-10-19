import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userJwt = authHeader.replace(/^Bearer\s+/i, '');

    if (!userJwt) {
      return NextResponse.json({ success: false, error: 'Token de autenticação obrigatório' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Configuração do servidor ausente' }, { status: 500 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Usuário não autenticado' }, { status: 401 });
    }

    const id =
      req.nextUrl.searchParams.get('id') ||
      req.nextUrl.searchParams.get('paymentId') ||
      req.nextUrl.searchParams.get('orderId');

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return NextResponse.json({ success: false, error: 'id do pagamento inválido ou ausente' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    // Consulta na API de pagamentos (/v1/payments)
    let mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      const externalRef = data.external_reference;

      if (!externalRef) {
        return NextResponse.json({ success: false, error: 'Pagamento sem referência de pedido' }, { status: 403 });
      }

      // Valida se o external_reference é de um pedido pertencente ao usuário logado
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, user_id, status, metadata')
        .eq('id', externalRef)
        .maybeSingle();

      if (orderError || !order || order.user_id !== user.id) {
        return NextResponse.json({ success: false, error: 'Acesso não autorizado ao pedido' }, { status: 403 });
      }

      // Se aprovado, garante persistência no Supabase imediatamente para status 'preparing'
      if (data.status === 'approved' || data.status_detail === 'accredited') {
        if (order.status === 'awaiting_payment' || order.status === 'pending') {
          try {
            await supabase.rpc('apply_payment_result', {
              p_order_id: externalRef,
              p_payment_id: String(data.id || id),
              p_mp_status: 'approved',
              p_amount: Number(data.transaction_amount || 0),
              p_status_detail: data.status_detail || null,
            });

            await supabase
              .from('orders')
              .update({
                status: 'preparing',
                updated_at: new Date().toISOString(),
              })
              .eq('id', externalRef);
          } catch (syncErr) {
            console.error('[pix-status] Erro ao sincronizar status aprovado no Supabase:', syncErr);
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
    mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      const externalRef = data.external_reference;

      if (!externalRef) {
        return NextResponse.json({ success: false, error: 'Pedido sem referência' }, { status: 403 });
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, user_id')
        .eq('id', externalRef)
        .maybeSingle();

      if (orderError || !order || order.user_id !== user.id) {
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
    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao consultar status do pagamento',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
