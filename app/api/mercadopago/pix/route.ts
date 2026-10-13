import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

async function resolvePayerEmail(supabase: any, user: any): Promise<string> {
  if (user.email && user.email.includes('@')) return user.email;
  try {
    const { data } = await supabase.from('profiles').select('email').eq('id', user.id).maybeSingle();
    if (data?.email && data.email.includes('@')) return data.email;
  } catch {}
  const phone = user.phone || user.user_metadata?.phone || '';
  const digits = phone.replace(/\D/g, '');
  return digits ? `${digits}@batatatop.com.br` : 'cliente@batatatop.com.br';
}

function pixHasEnoughLife(metadata: any): boolean {
  const exp = metadata?.pix?.expiration_date;
  if (!exp) return false;
  const expTime = new Date(exp).getTime();
  const twoMinMs = 2 * 60 * 1000;
  return expTime - Date.now() > twoMinMs;
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

    // 1. Extrair e validar Bearer token
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!bearerToken) {
      return NextResponse.json({ success: false, error: 'Token de autenticação ausente' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 });
    }

    // 2. Ler orderId do body
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 3. Buscar pedido e validar dono + status + método
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, payment_method, metadata')
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
    if (order.payment_method !== 'pix') {
      return NextResponse.json({ success: false, error: 'payment_method_mismatch' }, { status: 400 });
    }

    const numericAmount = Number(Number(order.total_amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'online_total_must_be_positive' }, { status: 400 });
    }

    // 4. Reaproveitar QR com mais de 2 min de vida
    if (pixHasEnoughLife(order.metadata)) {
      return NextResponse.json({
        success: true,
        simulation: false,
        paymentId: order.metadata.pix.payment_id,
        qrCode: order.metadata.pix.qr_code,
        qrCodeBase64: order.metadata.pix.qr_code_base64,
        ticketUrl: order.metadata.pix.ticket_url,
        expirationDate: order.metadata.pix.expiration_date,
      });
    }

    // 5. Resolver e-mail do pagador
    const payerEmail = await resolvePayerEmail(supabase, user);
    const pixN = (order.metadata?.pix_attempts || 0) + 1;
    const idempotencyKey = `order_${orderId}_pix_${pixN}`;

    // 6. Expiração: agora + 30 min, fuso -03:00
    const exp = new Date(Date.now() + 30 * 60 * 1000 - 3 * 60 * 60 * 1000);
    const expirationDate = exp.toISOString().replace('Z', '-03:00');

    // 7. Criar pagamento no Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: numericAmount,
        description: 'Pedido Batata Top',
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
        },
        external_reference: orderId,
        notification_url: 'https://batatatop.vercel.app/api/mercadopago/webhook',
        date_of_expiration: expirationDate,
      }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

      // 8. Gravar metadata.pix + pix_attempts via merge_order_metadata
      const { error: mergeError } = await supabase.rpc('merge_order_metadata', {
        order_id: orderId,
        patch: {
          pix_attempts: pixN,
          pix: {
            payment_id: String(data.id),
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            ticket_url: ticketUrl,
            expiration_date: data.date_of_expiration || expirationDate,
          },
        },
      });

      if (mergeError) {
        console.error('[pix] Erro ao gravar metadata:', mergeError.message);
      }

      return NextResponse.json({
        success: true,
        simulation: false,
        paymentId: data.id,
        status: data.status,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        expirationDate: data.date_of_expiration || expirationDate,
      });
    }

    console.error('[pix] Erro Mercado Pago:', data.message);

    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao gerar pagamento PIX no Mercado Pago',
    });
  } catch (err: any) {
    console.error('[pix] Exceção:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro de conexão com o Mercado Pago' });
  }
}
