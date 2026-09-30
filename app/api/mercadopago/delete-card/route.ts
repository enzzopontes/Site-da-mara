import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    const { customerId, cardId } = await req.json();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    if (!customerId || !cardId) {
      return NextResponse.json(
        { success: false, error: 'customerId e cardId são obrigatórios' },
        { status: 400 }
      );
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards/${cardId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (mpRes.ok) {
      return NextResponse.json({ success: true, simulation: false });
    }

    const data = await mpRes.json().catch(() => ({}));
    return NextResponse.json({
      success: false,
      error: data.message || 'Erro ao remover cartão no Mercado Pago',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
