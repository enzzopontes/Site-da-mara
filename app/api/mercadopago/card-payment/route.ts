import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // 1. Validar Bearer
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!bearerToken) {
      return NextResponse.json({ success: false, error: 'Token de autenticação ausente' }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 });
    }

    // 2. Ler body
    const {
      orderId,
      token: cardToken,
      paymentMethodId,
      issuerId,
      docNumber,
      savedCardId,
    } = await req.json();

    if (!cardToken) {
      return NextResponse.json({ success: false, error: 'Token do cartão ausente' }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId é obrigatório' }, { status: 400 });
    }

    // 2.1 Se savedCardId foi informado, buscar o mp_customer_id correspondente
    let mpCustomerId: string | null = null;
    if (savedCardId) {
      const { data: savedCard, error: cardErr } = await supabase
        .from('payment_cards')
        .select('id, user_id, mp_customer_id')
        .eq('id', savedCardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cardErr || !savedCard) {
        return NextResponse.json({ success: false, error: 'Cartão salvo não encontrado ou não pertence ao usuário' }, { status: 404 });
      }
      mpCustomerId = savedCard.mp_customer_id;
    }

    // 3. Buscar pedido + validar dono, status, método online
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
    if (order.payment_method !== 'cartao') {
      return NextResponse.json({ success: false, error: 'payment_method_mismatch' }, { status: 400 });
    }

    const numericAmount = Number(Number(order.total_amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'online_total_must_be_positive' }, { status: 400 });
    }

    // 4. Máx 5 tentativas de cartão
    const existingPayments = Array.isArray(order.metadata?.card_payments) ? order.metadata.card_payments : [];
    const attemptCount = existingPayments.length;
    if (attemptCount >= 5) {
      return NextResponse.json({ success: false, error: 'Limite de tentativas de cartão excedido (máx 5)' }, { status: 429 });
    }

    // 5. CPF com validação de dígitos verificadores
    const cleanDocNumber = await resolveDocNumber(supabase, user.id, docNumber);
    if (!cleanDocNumber) {
      return NextResponse.json({ success: false, error: 'CPF inválido. Informe um CPF válido para pagamento com cartão.' }, { status: 400 });
    }

    // 6. E-mail e idempotency
    const payerEmail = await resolvePayerEmail(supabase, user);
    const cardN = attemptCount + 1;
    const idempotencyKey = `order_${orderId}_card_${cardN}`;

    const mpBody: Record<string, any> = {
      transaction_amount: numericAmount,
      token: cardToken,
      description: 'Pedido Batata Top',
      installments: 1,
      payment_method_id: paymentMethodId,
      external_reference: orderId,
      notification_url: 'https://batatatop.vercel.app/api/mercadopago/webhook',
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

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    });

    const data = await mpRes.json();

    console.log(`[card-payment] Order: ${orderId}, Payment: ${data.id}, Status: ${data.status}, StatusDetail: ${data.status_detail}`);

    // 7. Gravar tentativa em metadata.card_payments via merge_order_metadata
    const cardPaymentEntry = {
      attempt_number: cardN,
      payment_id: data.id ? String(data.id) : null,
      status: data.status || null,
      status_detail: data.status_detail || null,
    };
    const { error: mergeError } = await supabase.rpc('merge_order_metadata', {
      order_id: orderId,
      patch: {
        card_payments: [...existingPayments, cardPaymentEntry],
      },
    });

    if (mergeError) {
      console.error('[card-payment] Erro ao gravar metadata:', mergeError.message);
    }

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        paymentId: data.id ? String(data.id) : null,
        status: data.status,
        statusDetail: data.status_detail,
      });
    }

    // Mesmo com HTTP de erro da MP (ex: 400 rejected), se houver status retornado, repassamos para a UI tratar
    if (data.status) {
      return NextResponse.json({
        success: true,
        paymentId: data.id ? String(data.id) : null,
        status: data.status,
        statusDetail: data.status_detail,
        error: data.message,
      });
    }

    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao processar pagamento com cartão',
    });
  } catch (err: any) {
    console.error('[card-payment] Exceção:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro de conexão' }, { status: 500 });
  }
}
