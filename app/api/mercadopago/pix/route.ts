import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequestUser } from '@/lib/supabase/route-auth';

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

    // 1. Autenticar via Authorization: Bearer (App Mobile) ou cookie SSR (Web)
    const user = await authenticateRequestUser(req, supabase);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Token inválido, ausente ou expirado' }, { status: 401 });
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

    // 5. Resolver e-mail do pagador e incrementar pix_attempts atomicamente no banco
    const payerEmail = await resolvePayerEmail(supabase, user);
    const { data: atomicAttempt, error: attemptError } = await supabase.rpc(
      'increment_order_pix_attempts',
      { p_order_id: orderId }
    );
    if (attemptError || typeof atomicAttempt !== 'number' || atomicAttempt < 1) {
      console.error('[pix] Erro ao incrementar pix_attempts atomicamente:', attemptError?.message);
      return NextResponse.json(
        { success: false, error: 'Erro ao iniciar tentativa de pagamento Pix' },
        { status: 500 }
      );
    }
    const pixN = atomicAttempt;
    const idempotencyKey = `order_${orderId}_pix_${pixN}`;

    // 6. Expiração: agora + 30 min, fuso -03:00
    const exp = new Date(Date.now() + 30 * 60 * 1000 - 3 * 60 * 60 * 1000);
    const expirationDate = exp.toISOString().replace('Z', '-03:00');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://batatatopiacanga.com.br';

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
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        date_of_expiration: expirationDate,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

      // 8. APP-10: Persistência autoritativa server-side via service_role (pix_attempts já persistido atomicamente)
      const pixPatch = {
        pix: {
          payment_id: String(data.id),
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          ticket_url: ticketUrl,
          expiration_date: data.date_of_expiration || expirationDate,
        },
      };

      const { error: mergeError } = await supabase.rpc('merge_order_metadata', {
        order_id: orderId,
        patch: pixPatch,
      });

      if (mergeError) {
        console.error('[pix] Erro em merge_order_metadata, aplicando fallback service_role:', mergeError.message);
        const { error: fallbackErr } = await supabase
          .from('orders')
          .update({
            metadata: { ...(order.metadata || {}), pix_attempts: pixN, ...pixPatch },
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);
        if (fallbackErr) {
          console.error('[pix] Falha crítica ao persistir QR Code no servidor:', fallbackErr.message);
          return NextResponse.json(
            { success: false, error: 'Erro ao salvar dados do Pix no pedido' },
            { status: 500 }
          );
        }
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

    return NextResponse.json(
      {
        success: false,
        error: data.message || 'Erro ao gerar pagamento PIX no Mercado Pago',
      },
      { status: mpRes.status || 400 }
    );
  } catch (err: any) {
    console.error('[pix] Exceção:', err?.message);
    return NextResponse.json(
      { success: false, error: err?.message || 'Erro de conexão com o Mercado Pago' },
      { status: 500 }
    );
  }
}
