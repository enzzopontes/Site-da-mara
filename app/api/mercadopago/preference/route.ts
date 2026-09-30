import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { amount, orderNumber, itemsList = [] } = await req.json();
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    const items = itemsList.map((item: any) => ({
      title: item.nome || 'Item do Pedido',
      quantity: item.quantity,
      unit_price: Number(item.precoNum) / 100,
      currency_id: 'BRL',
    }));

    if (items.length === 0) {
      items.push({
        title: `Pedido #${orderNumber}`,
        quantity: 1,
        unit_price: Number(amount),
        currency_id: 'BRL',
      });
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        external_reference: String(orderNumber),
        notification_url: 'https://batatatop.vercel.app/api/mercadopago/webhook',
        back_urls: {
          success: 'batatatop://pedidos',
          failure: 'batatatop://cart',
          pending: 'batatatop://pedidos',
        },
        auto_return: 'approved',
      }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        checkoutUrl: data.sandbox_init_point || data.init_point,
        preferenceId: data.id,
      });
    }

    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao criar preferência de pagamento no Mercado Pago',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
