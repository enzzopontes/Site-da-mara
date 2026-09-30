import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { customerId, cardToken } = await req.json();
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    if (!customerId || !cardToken) {
      return NextResponse.json(
        { success: false, error: 'customerId e cardToken são obrigatórios' },
        { status: 400 }
      );
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: cardToken }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      return NextResponse.json({
        success: true,
        simulation: false,
        cardId: data.id,
        lastFour: data.last_four_digits,
        paymentMethodId: data.payment_method?.id,
      });
    }

    // Se o cartão já existir ou for duplicado, busca os cartões existentes do customer para não quebrar o fluxo
    const isDuplicate =
      data.cause?.some((c: any) => c.code === 103 || c.code === '103' || String(c.description || '').toLowerCase().includes('already exists')) ||
      String(data.message || '').toLowerCase().includes('already exists');

    if (isDuplicate) {
      const listRes = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (listRes.ok) {
        const cardsList = await listRes.json();
        if (Array.isArray(cardsList) && cardsList.length > 0) {
          const lastCard = cardsList[cardsList.length - 1];
          return NextResponse.json({
            success: true,
            simulation: false,
            cardId: lastCard.id,
            lastFour: lastCard.last_four_digits,
            paymentMethodId: lastCard.payment_method?.id,
          });
        }
      }
    }

    return NextResponse.json({
      success: false,
      error: data.cause?.[0]?.description || data.message || 'Erro ao salvar cartão no Mercado Pago',
      details: data,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
