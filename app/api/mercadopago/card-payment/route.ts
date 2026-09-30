import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    const {
      amount,
      token: cardToken,
      paymentMethodId,
      issuerId,
      email,
      name,
      docNumber,
      orderNumber,
    } = await req.json();

    const numericAmount = Number(Number(amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor da transação inválido' },
        { status: 400 }
      );
    }

    if (!cardToken) {
      return NextResponse.json(
        { success: false, error: 'Token do cartão ausente' },
        { status: 400 }
      );
    }

    const cleanDocNumber = (docNumber || '').replace(/\D/g, '');
    const cleanName = (typeof name === 'string' ? name.trim() : '') || 'Cliente';
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Batatatop';
    const payerEmail = typeof email === 'string' && email.includes('@') ? email.trim() : 'cliente@batatatop.com';

    const idempotencyKey = crypto.randomUUID();

    const mpBody: Record<string, any> = {
      transaction_amount: numericAmount,
      token: cardToken,
      description: `Pedido Batata Top #${orderNumber}`,
      installments: 1,
      payment_method_id: paymentMethodId,
      external_reference: String(orderNumber),
      notification_url: 'https://batatatop.vercel.app/api/mercadopago/webhook',
      statement_descriptor: 'BATATA TOP',
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        identification: { type: 'CPF', number: cleanDocNumber || '00000000000' },
      },
    };

    if (issuerId) {
      mpBody.issuer_id = Number(issuerId);
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

    // Log apenas de payment id, order id e status (NUNCA dados sensíveis)
    console.log(`[card-payment] Order: ${orderNumber}, Payment: ${data.id}, Status: ${data.status}, StatusDetail: ${data.status_detail}`);

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        paymentId: data.id,
        status: data.status,
        statusDetail: data.status_detail,
      });
    }

    // Mesmo com HTTP de erro da MP (ex: 400 rejected), se houver status retornado, repassamos para a UI tratar
    if (data.status) {
      return NextResponse.json({
        success: true,
        paymentId: data.id,
        status: data.status,
        statusDetail: data.status_detail,
        error: data.message,
      });
    }

    return NextResponse.json({
      success: false,
      status: data.status || 'rejected',
      statusDetail: data.status_detail || data.cause?.[0]?.description,
      error: data.cause?.[0]?.description || data.message || 'Erro ao processar pagamento via cartão no Mercado Pago',
    });
  } catch (err: any) {
    console.error('[card-payment] Exceção na requisição:', err?.message);
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
