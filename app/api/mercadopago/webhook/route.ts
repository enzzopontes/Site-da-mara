import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error('[webhook] Supabase URL ou SERVICE_ROLE_KEY não configurados');
    return null;
  }
  return createClient(url, serviceRole);
}

// Valida a assinatura do Mercado Pago (X-Signature), se MERCADO_PAGO_WEBHOOK_SECRET estiver configurado.
function isValidSignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Se não configurado, não bloqueia (avisado no relatório)

  const signatureHeader = req.headers.get('x-signature') || '';
  const requestId = req.headers.get('x-request-id') || '';

  const parts: Record<string, string> = {};
  signatureHeader.split(',').forEach((p) => {
    const [k, v] = p.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  });

  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  return hmac === v1;
}

async function processPaymentNotification(paymentId: string) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token || !paymentId) return;

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!mpRes.ok) {
    console.error(`[webhook] Erro ao buscar pagamento ${paymentId} no MP`);
    return;
  }

  const paymentData = await mpRes.json();
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const externalRef = paymentData.external_reference;
  const paymentIdStr = String(paymentData.id);

  let order: { id: string; status: string; metadata: any } | null = null;

  // 1. Localiza pedido por external_reference (número do pedido ou id)
  if (externalRef) {
    if (/^\d+$/.test(externalRef)) {
      const { data } = await supabase
        .from('orders')
        .select('id, status, metadata')
        .eq('order_number', Number(externalRef))
        .maybeSingle();
      order = data;
    }
    if (!order) {
      const { data } = await supabase
        .from('orders')
        .select('id, status, metadata')
        .eq('id', externalRef)
        .maybeSingle();
      order = data;
    }
  }

  // 2. Se não localizou por external_reference, busca no metadata do JSONB
  if (!order) {
    const { data: pixOrder } = await supabase
      .from('orders')
      .select('id, status, metadata')
      .eq('metadata->pix->>payment_id', paymentIdStr)
      .maybeSingle();
    order = pixOrder;
  }

  if (!order) {
    const { data: pixIdOrder } = await supabase
      .from('orders')
      .select('id, status, metadata')
      .eq('metadata->pix->>id', paymentIdStr)
      .maybeSingle();
    order = pixIdOrder;
  }

  if (!order) {
    const { data: cardOrder } = await supabase
      .from('orders')
      .select('id, status, metadata')
      .eq('metadata->card->>payment_id', paymentIdStr)
      .maybeSingle();
    order = cardOrder;
  }

  if (!order) {
    console.log(`[webhook] Pedido não encontrado para pagamento ${paymentIdStr}`);
    return;
  }

  // Idempotência: nunca reprocessa se já avançou de awaiting_payment
  if (order.status !== 'awaiting_payment') {
    console.log(`[webhook] Pedido #${order.id} já em status: ${order.status}. Nenhuma alteração.`);
    return;
  }

  const mpStatus = paymentData.status;
  let nextStatus: string | null = null;

  if (mpStatus === 'approved') {
    nextStatus = 'pending';
  } else if (
    mpStatus === 'rejected' ||
    mpStatus === 'cancelled' ||
    mpStatus === 'refunded' ||
    mpStatus === 'charged_back'
  ) {
    nextStatus = 'cancelled';
  }

  if (nextStatus) {
    const updatedMetadata: Record<string, any> = {
      ...(order.metadata || {}),
      mp_payment_id: paymentIdStr,
      mp_payment_status: mpStatus,
      mp_status_detail: paymentData.status_detail,
    };

    if (mpStatus === 'approved') {
      updatedMetadata.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('orders')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
        metadata: updatedMetadata,
      })
      .eq('id', order.id);

    if (error) {
      console.error('[webhook] Erro ao atualizar status do pedido:', error.message);
    } else {
      console.log(`[webhook] Pedido #${order.id} atualizado para '${nextStatus}' (MP: ${mpStatus})`);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const url = req.nextUrl;
    let dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
    let type = url.searchParams.get('type') || url.searchParams.get('topic') || '';

    // Se parâmetros não vierem na query string, tenta ler do body JSON
    if (!dataId) {
      try {
        const body = await req.json();
        dataId = body?.data?.id || body?.id || '';
        type = type || body?.type || (body?.action?.startsWith('payment') ? 'payment' : '');
      } catch {}
    }

    if (!dataId) {
      return NextResponse.json({ received: true });
    }

    if (!isValidSignature(req, dataId)) {
      console.error('[webhook] Assinatura inválida — notificação ignorada.');
      return NextResponse.json({ received: true });
    }

    // Mercado Pago pode enviar type 'payment' ou 'order'
    if (type === 'payment' || !type) {
      await processPaymentNotification(dataId);
    } else if (type === 'order') {
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (token) {
        const orderRes = await fetch(`https://api.mercadopago.com/v1/orders/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          const firstPaymentId = orderData.transactions?.payments?.[0]?.id;
          if (firstPaymentId) {
            await processPaymentNotification(String(firstPaymentId));
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[webhook] Exceção:', err?.message);
    return NextResponse.json({ received: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
