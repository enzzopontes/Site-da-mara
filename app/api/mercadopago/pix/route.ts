import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    const { amount, email, name, orderNumber } = await req.json();

    const numericAmount = Number(Number(amount).toFixed(2));
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valor da transação inválido' },
        { status: 400 }
      );
    }

    const cleanName = (typeof name === 'string' ? name.trim() : '') || 'Cliente';
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Batatatop';
    const payerEmail = typeof email === 'string' && email.includes('@') ? email.trim() : 'cliente@batatatop.com';

    const expirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const idempotencyKey = crypto.randomUUID();

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: numericAmount,
        description: `Pedido Batata Top #${orderNumber}`,
        payment_method_id: 'pix',
        payer: {
          email: payerEmail,
          first_name: firstName,
          last_name: lastName,
        },
        external_reference: String(orderNumber),
        notification_url: 'https://batatatop.vercel.app/api/mercadopago/webhook',
        date_of_expiration: expirationDate,
      }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
      const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
      const ticketUrl = data.point_of_interaction?.transaction_data?.ticket_url;

      return NextResponse.json({
        success: true,
        simulation: false,
        id: data.id,
        paymentId: data.id,
        orderId: data.id,
        status: data.status,
        statusDetail: data.status_detail,
        qrCode,
        qrCodeBase64,
        ticketUrl,
        expirationDate: data.date_of_expiration || expirationDate,
      });
    }

    console.error('[pix] Erro Mercado Pago /v1/payments:', data.id, data.status, data.message);

    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao gerar pagamento PIX no Mercado Pago',
      details: data,
    });
  } catch (err: any) {
    console.error('[pix] Exceção:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro de conexão com o Mercado Pago' });
  }
}
