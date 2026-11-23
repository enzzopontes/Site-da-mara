import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendBarkNotification } from '@/lib/bark-service';
import { authenticateRequestUser } from '@/lib/supabase/route-auth';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(digits[10]);
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

async function resolveDocNumber(supabase: any, userId: string, clientDoc: string | undefined): Promise<string | null> {
  // 1. profiles.cpf válido
  try {
    const { data } = await supabase.from('profiles').select('cpf').eq('id', userId).maybeSingle();
    if (data?.cpf && isValidCpf(data.cpf)) return data.cpf.replace(/\D/g, '');
  } catch {}
  // 2. docNumber do cliente válido
  if (clientDoc && isValidCpf(clientDoc)) return clientDoc.replace(/\D/g, '');
  // 3. Sem CPF válido -> null (400)
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' }, { status: 500 });
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

    // 2. Ler body
    const {
      orderId,
      token: cardToken,
      paymentMethodId,
      issuerId,
      docNumber,
      savedCardId,
      installments,
      installmentsBaseAmount,
    } = await req.json();

    if (!cardToken) {
      return NextResponse.json({ success: false, error: 'Token do cartão ausente' }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 2.1 Se savedCardId foi informado, buscar mp_customer_id, payment_method_id e card_type autoritativos no banco (SEC-04)
    let mpCustomerId: string | null = null;
    let authoritativePaymentMethodId: string | null = paymentMethodId ? String(paymentMethodId).trim() : null;
    let authoritativeCardType: 'credit' | 'debit' | null = null;

    if (savedCardId) {
      const { data: savedCard, error: cardErr } = await supabase
        .from('payment_cards')
        .select('id, user_id, mp_customer_id, payment_method_id, card_type')
        .eq('id', savedCardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cardErr || !savedCard) {
        return NextResponse.json({ success: false, error: 'Cartão salvo não encontrado ou não pertence ao usuário' }, { status: 404 });
      }
      mpCustomerId = savedCard.mp_customer_id;
      authoritativePaymentMethodId = savedCard.payment_method_id;
      const normalizedCardType = String(savedCard.card_type || '').toLowerCase();
      authoritativeCardType =
        normalizedCardType.includes('débito') || normalizedCardType.includes('debito') || normalizedCardType === 'debit'
          ? 'debit'
          : 'credit';
    }

    if (!authoritativePaymentMethodId) {
      return NextResponse.json({ success: false, error: 'Método de pagamento do cartão ausente' }, { status: 400 });
    }

    // 3. Buscar pedido + validar dono, status, método online
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, customer_name, status, total_amount, payment_method, metadata')
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
    if (order.payment_method !== 'cartao') {
      return NextResponse.json({ success: false, error: 'payment_method_mismatch' }, { status: 400 });
    }

    const numericAmount = Number(Number(order.total_amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'online_total_must_be_positive' }, { status: 400 });
    }

    const effectiveCardType = authoritativeCardType || (order.metadata?.card_type === 'debit' ? 'debit' : 'credit');
    const numericInstallments = installments == null ? 1 : Number(installments);
    if (!Number.isInteger(numericInstallments) || numericInstallments < 1 || numericInstallments > 12) {
      return NextResponse.json({ success: false, error: 'invalid_installments' }, { status: 400 });
    }
    if (numericInstallments > 1) {
      if (effectiveCardType === 'debit') {
        return NextResponse.json({ success: false, error: 'invalid_installments' }, { status: 400 });
      }
      if (installmentsBaseAmount == null || Math.abs(Number(installmentsBaseAmount) - numericAmount) > 0.05) {
        return NextResponse.json({ success: false, error: 'installments_amount_mismatch' }, { status: 409 });
      }
    }

    // 4. CPF com validação de dígitos verificadores (antes de consumir tentativa)
    const cleanDocNumber = await resolveDocNumber(supabase, user.id, docNumber);
    if (!cleanDocNumber) {
      return NextResponse.json({ success: false, error: 'CPF inválido. Informe um CPF válido para pagamento com cartão.' }, { status: 400 });
    }

    // 5. SEC-03 FIX: Reserva atômica (FOR UPDATE) da tentativa de cartão (máx 5 tentativas sem race condition)
    const { data: reservation, error: reserveErr } = await supabase.rpc('reserve_card_payment_attempt', {
      p_order_id: orderId,
      p_user_id: user.id,
    });

    if (reserveErr || !reservation) {
      console.error('[card-payment] Erro ao reservar tentativa:', reserveErr?.message);
      return NextResponse.json({ success: false, error: 'Não foi possível iniciar tentativa de pagamento' }, { status: 500 });
    }
    if (!reservation.ok) {
      return NextResponse.json(
        { success: false, error: reservation.error || 'Tentativa não permitida' },
        { status: Number(reservation.http_status) || 400 }
      );
    }

    const cardN = Number(reservation.attempt_number);

    // Persiste CPF em profiles se ausente
    try {
      await supabase.from('profiles').update({ cpf: cleanDocNumber }).eq('id', user.id).is('cpf', null);
    } catch {}

    // 6. E-mail e idempotency
    const payerEmail = await resolvePayerEmail(supabase, user);
    const idempotencyKey = `order_${orderId}_card_${cardN}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://batatatopiacanga.com.br';

    const mpBody: Record<string, any> = {
      transaction_amount: numericAmount,
      token: cardToken,
      description: 'Pedido Batata Top',
      installments: numericInstallments,
      payment_method_id: authoritativePaymentMethodId,
      external_reference: orderId,
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
      statement_descriptor: 'BATATA TOP',
      payer: mpCustomerId
        ? {
            type: 'customer',
            id: mpCustomerId,
          }
        : {
            email: payerEmail,
            identification: { type: 'CPF', number: cleanDocNumber },
          },
    };

    if (issuerId) {
      mpBody.issuer_id = issuerId;
    }

    let mpRes: Response;
    let data: any;
    try {
      mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(mpBody),
      });

      data = await mpRes.json();
    } catch (mpErr: any) {
      const errMsg = mpErr?.message || 'Erro de comunicação com o gateway de pagamento';
      console.error('[card-payment] Falha na chamada ao Mercado Pago:', errMsg);
      try {
        const { error: finalizeErr } = await supabase.rpc('finalize_card_payment_attempt', {
          p_order_id: orderId,
          p_attempt_number: cardN,
          p_payment_id: null,
          p_status: 'error',
          p_status_detail: errMsg,
        });
        if (finalizeErr) {
          console.error('[card-payment] Erro ao finalizar tentativa após falha de gateway:', finalizeErr.message);
        }
      } catch (finEx: any) {
        console.error('[card-payment] Exceção ao finalizar tentativa após falha de gateway:', finEx?.message);
      }
      return NextResponse.json(
        {
          success: false,
          code: 'mp_gateway_error',
          error: 'Erro de comunicação com o gateway de pagamento. Tente novamente.',
        },
        { status: 502 }
      );
    }

    console.log(`[card-payment] Order: ${orderId}, Payment: ${data.id}, Status: ${data.status}, StatusDetail: ${data.status_detail}`);

    // 7. SEC-03 FIX: Finaliza atomicamente a tentativa reservada em metadata.card_payments
    const paymentIdStr = data.id ? String(data.id) : null;
    const { error: finalizeError } = await supabase.rpc('finalize_card_payment_attempt', {
      p_order_id: orderId,
      p_attempt_number: cardN,
      p_payment_id: paymentIdStr,
      p_status: data.status || (mpRes.ok ? 'unknown' : 'error'),
      p_status_detail: data.status_detail || data.message || null,
    });

    if (finalizeError) {
      console.error('[card-payment] Erro ao finalizar tentativa em metadata:', finalizeError.message);
    }

    // 8. BUG-04 FIX: Se aprovado sincronamente, invoca apply_payment_result imediatamente e notifica admin apenas após aprovação confirmada
    if (mpRes.ok && (data.status === 'approved' || data.status_detail === 'accredited') && paymentIdStr) {
      const { data: applyRes, error: applyErr } = await supabase.rpc('apply_payment_result', {
        p_order_id: orderId,
        p_payment_id: paymentIdStr,
        p_mp_status: 'approved',
        p_amount: Number(data.transaction_amount ?? numericAmount),
        p_status_detail: data.status_detail || null,
      });

      if (applyErr) {
        console.error('[card-payment] Erro ao aplicar resultado aprovado:', applyErr.message);
        return NextResponse.json(
          {
            success: false,
            code: 'payment_sync_error',
            error: 'Erro ao sincronizar status do pagamento',
          },
          { status: 500 }
        );
      }

      if (applyRes?.action === 'held_underpaid') {
        return NextResponse.json(
          {
            success: false,
            status: 'held_underpaid',
            action: 'held_underpaid',
            code: 'held_underpaid',
            needs_review: true,
            error: 'Pagamento com valor divergente encaminhado para revisão manual.',
          },
          { status: 409 }
        );
      }

      if (applyRes?.action === 'order_approved') {
        try {
          const barkRes = await sendBarkNotification({
            id: order.id,
            order_number: applyRes.order_number ?? order.order_number,
            customer_name: order.customer_name,
            total_amount: numericAmount,
            payment_method: effectiveCardType === 'debit' ? 'Cartão de Débito' : 'Cartão de Crédito',
          });
          if (barkRes.success) {
            await supabase.rpc('merge_order_metadata', {
              order_id: orderId,
              patch: {
                bark_attempts: 1,
                bark_last_sent_at: new Date().toISOString(),
              },
            });
          }
        } catch (notifyErr: any) {
          console.warn('[card-payment] Falha ao notificar Bark pós-aprovação:', notifyErr?.message);
        }
      }
    }

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        paymentId: paymentIdStr,
        status: data.status,
        statusDetail: data.status_detail,
      });
    }

    // Mesmo com HTTP de erro da MP (ex: 400 rejected), se houver status retornado, repassamos para a UI tratar
    if (typeof data.status === 'string') {
      return NextResponse.json({
        success: true,
        paymentId: paymentIdStr,
        status: data.status,
        statusDetail: data.status_detail,
        error: data.message,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: data.message || 'Erro ao processar pagamento com cartão',
      },
      { status: mpRes.status || 400 }
    );
  } catch (err: any) {
    console.error('[card-payment] Exceção:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro de conexão' }, { status: 500 });
  }
}
