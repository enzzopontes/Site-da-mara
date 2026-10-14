import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole);
}

// Consulta as opções reais de parcelamento (crédito) no Mercado Pago.
// Para cartão salvo, BIN/bandeira/emissor vêm do cartão do customer no MP (customerId nunca sai do servidor).
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

    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!bearerToken) {
      return NextResponse.json({ success: false, error: 'Token de autenticação ausente' }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(bearerToken);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const { amount, savedCardId, bin } = await req.json();

    const numericAmount = Number(Number(amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valor inválido' }, { status: 400 });
    }

    const params = new URLSearchParams({ amount: numericAmount.toFixed(2) });

    if (savedCardId) {
      const { data: savedCard, error: cardErr } = await supabase
        .from('payment_cards')
        .select('id, mp_customer_id, mp_card_id')
        .eq('id', savedCardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (cardErr || !savedCard?.mp_customer_id || !savedCard?.mp_card_id) {
        return NextResponse.json({ success: false, error: 'Cartão salvo não encontrado ou não pertence ao usuário' }, { status: 404 });
      }

      const mpCardRes = await fetch(
        `https://api.mercadopago.com/v1/customers/${savedCard.mp_customer_id}/cards/${savedCard.mp_card_id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const mpCard = await mpCardRes.json().catch(() => ({}));
      if (!mpCardRes.ok || !mpCard.first_six_digits) {
        return NextResponse.json({ success: false, error: 'Não foi possível consultar o cartão no Mercado Pago' }, { status: 502 });
      }

      params.set('bin', String(mpCard.first_six_digits));
      if (mpCard.payment_method?.id) params.set('payment_method_id', String(mpCard.payment_method.id));
      if (mpCard.issuer?.id) params.set('issuer.id', String(mpCard.issuer.id));
    } else {
      const cleanBin = String(bin || '').replace(/\D/g, '');
      if (cleanBin.length < 6 || cleanBin.length > 8) {
        return NextResponse.json({ success: false, error: 'BIN do cartão inválido' }, { status: 400 });
      }
      params.set('bin', cleanBin);
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payment_methods/installments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await mpRes.json().catch(() => null);

    if (!mpRes.ok || !Array.isArray(data)) {
      return NextResponse.json({ success: false, error: data?.message || 'Erro ao consultar parcelamento' }, { status: 502 });
    }

    const credit = data.find((m: any) => m.payment_type_id === 'credit_card');
    if (!credit || !Array.isArray(credit.payer_costs) || credit.payer_costs.length === 0) {
      return NextResponse.json({ success: false, error: 'Parcelamento indisponível para este cartão' }, { status: 404 });
    }

    const payerCosts = credit.payer_costs
      .map((c: any) => ({
        installments: Number(c.installments),
        installmentAmount: Number(c.installment_amount),
        totalAmount: Number(c.total_amount),
      }))
      .filter((c: any) => c.installments >= 1 && c.installmentAmount > 0 && c.totalAmount > 0)
      .sort((a: any, b: any) => a.installments - b.installments);

    return NextResponse.json({
      success: true,
      amount: numericAmount,
      paymentMethodId: credit.payment_method_id || null,
      issuerId: credit.issuer?.id ? String(credit.issuer.id) : null,
      payerCosts,
    });
  } catch (err: any) {
    console.error('[installments] Exceção:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro de conexão' }, { status: 500 });
  }
}
