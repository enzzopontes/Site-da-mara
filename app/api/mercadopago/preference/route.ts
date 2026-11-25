import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequestUser } from '@/lib/supabase/route-auth';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

export async function POST(req: NextRequest) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'config: Supabase não configurado' }, { status: 500 });
    }

    // 1. Validar Bearer (App Mobile) ou cookie SSR (Web)
    const user = await authenticateRequestUser(req, supabase);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Token inválido, ausente ou expirado' }, { status: 401 });
    }

    // 2. Ler orderId
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 3. Buscar pedido e validar dono + status + método online
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, payment_method')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json({ success: false, error: 'order_not_found' }, { status: 404 });
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'forbidden_not_owner' }, { status: 403 });
    }
    if (order.status !== 'awaiting_payment') {
      return NextResponse.json({ success: false, error: 'order_status_not_payable' }, { status: 409 });
    }

    const numericAmount = Number(Number(order.total_amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'online_total_must_be_positive' }, { status: 400 });
    }

    // 4. Criar preferência com total do banco
    const items = [{
      title: 'Pedido Batata Top',
      quantity: 1,
      unit_price: numericAmount,
      currency_id: 'BRL',
    }];

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://batatatopiacanga.com.br').replace(/\/$/, '');

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        items,
        external_reference: orderId,
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        back_urls: {
          success: `${siteUrl}/pedidos?order_id=${encodeURIComponent(orderId)}`,
          failure: `${siteUrl}/carrinho?error=payment_failed`,
          pending: `${siteUrl}/pedidos?order_id=${encodeURIComponent(orderId)}`,
        },
        auto_return: 'approved',
      }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        checkoutUrl: data.init_point,
        preferenceId: data.id,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: data.message || 'Erro ao criar preferência de pagamento no Mercado Pago',
      },
      { status: mpRes.status >= 400 ? mpRes.status : 502 }
    );
  } catch (err) {
    console.error('[MercadoPago Preference] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Erro de conexão com o Mercado Pago' },
      { status: 500 }
    );
  }
}
