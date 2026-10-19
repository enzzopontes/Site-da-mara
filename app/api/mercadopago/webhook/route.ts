import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  buildExpoPushMessages,
  buildNewOrderPushContent,
  sendExpoPush,
} from '@/lib/push-notifications';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error('[webhook] Supabase URL ou SERVICE_ROLE_KEY não configurados');
    return null;
  }
  return createClient(url, serviceRole);
}

function parseXSignature(header: string | null): { ts: string | null; v1: string | null } {
  if (!header) return { ts: null, v1: null };
  const parts: Record<string, string> = {};
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  return { ts: parts['ts'] || null, v1: parts['v1'] || null };
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[webhook] MERCADO_PAGO_WEBHOOK_SECRET ausente');
      return NextResponse.json({ error: 'MERCADO_PAGO_WEBHOOK_SECRET não configurado' }, { status: 500 });
    }

    const url = req.nextUrl;
    let dataId = url.searchParams.get('data.id') || url.searchParams.get('id') || '';
    let type = url.searchParams.get('type') || url.searchParams.get('topic') || '';

    let body: any = null;
    if (!dataId || !type) {
      try {
        body = await req.json();
        dataId = dataId || body?.data?.id || body?.id || '';
        type = type || body?.type || (body?.action?.startsWith('payment') ? 'payment' : '');
      } catch {
        // Body não é JSON ou está vazio
      }
    }

    if (!dataId) {
      return NextResponse.json({ received: true, ignored: 'missing_data_id' }, { status: 200 });
    }

    // Assinatura x-signature OBRIGATÓRIA
    const signatureHeader = req.headers.get('x-signature');
    const requestId = req.headers.get('x-request-id') || '';
    const { ts, v1 } = parseXSignature(signatureHeader);

    if (!ts || !v1) {
      console.error('[webhook] Assinatura ausente ou incompleta');
      return NextResponse.json({ error: 'Assinatura inválida ou ausente' }, { status: 401 });
    }

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    const hmacBuf = Buffer.from(hmac, 'utf8');
    const v1Buf = Buffer.from(v1, 'utf8');

    if (hmacBuf.length !== v1Buf.length || !crypto.timingSafeEqual(hmacBuf, v1Buf)) {
      console.error('[webhook] Assinatura HMAC inválida');
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    // Processar apenas type === 'payment'
    if (type !== 'payment') {
      return NextResponse.json({ received: true, ignored: 'not_payment_event' }, { status: 200 });
    }

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) {
      console.error('[webhook] MERCADO_PAGO_ACCESS_TOKEN ausente');
      return NextResponse.json({ error: 'MERCADO_PAGO_ACCESS_TOKEN não configurado' }, { status: 500 });
    }

    // Buscar o pagamento no Mercado Pago (GET /v1/payments/{id})
    let mpRes: Response;
    try {
      mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (fetchErr: any) {
      console.error('[webhook] Falha de rede ao consultar pagamento no MP:', fetchErr?.message);
      return NextResponse.json({ error: 'Falha de rede ao consultar Mercado Pago' }, { status: 500 });
    }

    if (!mpRes.ok) {
      console.error(`[webhook] Erro ao buscar pagamento ${dataId} no MP: status ${mpRes.status}`);
      if (mpRes.status === 429 || mpRes.status >= 500) {
        return NextResponse.json({ error: `Mercado Pago API indisponível (${mpRes.status})` }, { status: 500 });
      }
      return NextResponse.json({ received: true, ignored: `mp_error_${mpRes.status}` }, { status: 200 });
    }

    const paymentData = await mpRes.json();
    const externalRef = paymentData?.external_reference;

    // Pedido localizado SOMENTE por id (= external_reference, validar formato UUID)
    if (!externalRef || typeof externalRef !== 'string' || !UUID_REGEX.test(externalRef)) {
      console.log(`[webhook] Pagamento ${dataId} possui external_reference inválido ou não-UUID: "${externalRef}"`);
      return NextResponse.json({ received: true, ignored: 'invalid_or_missing_uuid_external_reference' }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Configuração do banco de dados ausente' }, { status: 500 });
    }

    const paymentAmount = Number(paymentData.transaction_amount);
    const mpStatus = String(paymentData.status || '');
    const statusDetail = paymentData.status_detail ? String(paymentData.status_detail) : null;

    // Chamar rpc('apply_payment_result', {...}) com service_role
    const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_payment_result', {
      p_order_id: externalRef,
      p_payment_id: String(paymentData.id),
      p_mp_status: mpStatus,
      p_amount: paymentAmount,
      p_status_detail: statusDetail,
    });

    if (rpcError) {
      console.error('[webhook] Erro retornado pela rpc apply_payment_result:', rpcError.message);
      return NextResponse.json({ error: 'Erro ao aplicar resultado de pagamento no banco' }, { status: 500 });
    }

    const result = (rpcResult || {}) as {
      success?: boolean;
      action?: string;
      needs_review?: boolean;
      review_reason?: string;
      order_number?: number;
    };

    const action = result.action || '';

    // Respostas sem push
    if (
      !result.success ||
      action === 'already_processed' ||
      action === 'ignored_stale_payment_event' ||
      action === 'order_not_found'
    ) {
      return NextResponse.json({ received: true, action }, { status: 200 });
    }

    // Buscar tokens de admin se precisar enviar push
    const needsReview = !!result.needs_review || action.startsWith('flagged_') || action.startsWith('held_');
    const isApproved = action === 'order_approved';

    if (isApproved || needsReview) {
      try {
        const { data: tokenRows } = await supabase
          .from('admin_push_tokens')
          .select('expo_push_token');

        const uniqueTokens = [
          ...new Set((tokenRows || []).map((t: any) => t.expo_push_token).filter(Boolean)),
        ] as string[];

        if (uniqueTokens.length > 0) {
          if (isApproved) {
            // Push de novo pedido aprovado
            const { data: orderData } = await supabase
              .from('orders')
              .select(`
                id, order_number, customer_name, customer_phone,
                delivery_type, customer_address, customer_complement, customer_neighborhood,
                payment_method, total_amount, notes,
                order_items (id, product_name, quantity, product_price, adicionais)
              `)
              .eq('id', externalRef)
              .maybeSingle();

            if (orderData) {
              const content = buildNewOrderPushContent(orderData, orderData.order_items || []);
              const messages = buildExpoPushMessages(uniqueTokens, content);
              await sendExpoPush(messages);

              // Marca como notificado via rpc merge_order_metadata para a rota manual não duplicar
              await supabase.rpc('merge_order_metadata', {
                order_id: externalRef,
                patch: {
                  admin_push_sent: true,
                  admin_push_sent_at: new Date().toISOString(),
                },
              });
            }
          }

          if (needsReview) {
            // Push de pedido que requer revisão pelo admin via buildExpoPushMessages
            const orderNumLabel = result.order_number
              ? `#${result.order_number}`
              : `#${externalRef.slice(-4).toUpperCase()}`;
            const reason = result.review_reason || action || 'Pagamento requer atenção';

            const reviewContent = {
              title: `⚠️ Pedido ${orderNumLabel} requer revisão`,
              subtitle: 'Atenção necessária',
              body: `Motivo: ${reason}`,
              data: {
                orderId: externalRef,
                screen: 'admin/pedidos',
                url: '/admin/pedidos',
              },
            };

            const reviewMessages = buildExpoPushMessages(uniqueTokens, reviewContent as any);
            await sendExpoPush(reviewMessages);
          }
        }
      } catch (pushErr: any) {
        console.error('[webhook] Falha não-bloqueante ao disparar push:', pushErr?.message);
      }
    }

    return NextResponse.json({ received: true, action }, { status: 200 });
  } catch (err: any) {
    console.error('[webhook] Exceção não tratada:', err?.message);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
