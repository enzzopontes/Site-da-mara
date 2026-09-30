import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const id =
      req.nextUrl.searchParams.get('id') ||
      req.nextUrl.searchParams.get('paymentId') ||
      req.nextUrl.searchParams.get('orderId');

    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id do pagamento é obrigatório' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    // Consulta primeiro na API de pagamentos (/v1/payments)
    let mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      return NextResponse.json({
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
        paymentStatus: data.status,
        paymentStatusDetail: data.status_detail,
        dateOfExpiration: data.date_of_expiration,
      });
    }

    // Fallback para orders antigas (/v1/orders) caso seja um ID legado
    mpRes = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (mpRes.ok) {
      const data = await mpRes.json();
      const payment = data.transactions?.payments?.[0];
      return NextResponse.json({
        success: true,
        status: data.status,
        statusDetail: data.status_detail,
        paymentStatus: payment?.status,
        paymentStatusDetail: payment?.status_detail,
      });
    }

    const data = await mpRes.json().catch(() => ({}));
    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao consultar status do pagamento',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
