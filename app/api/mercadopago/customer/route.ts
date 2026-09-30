import { NextRequest, NextResponse } from 'next/server';

async function findCustomerByEmail(email: string, token: string) {
  try {
    const res = await fetch(
      `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    const customer = data.results?.[0];
    if (res.ok && customer) {
      return { success: true, customerId: customer.id };
    }
    return { success: false, error: 'Cliente não encontrado' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, lastName } = await req.json();
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'config: MERCADO_PAGO_ACCESS_TOKEN ausente' },
        { status: 500 }
      );
    }

    if (!email) {
      return NextResponse.json({ success: false, error: 'E-mail é obrigatório' }, { status: 400 });
    }

    // Busca cliente existente por e-mail antes de criar
    const existing = await findCustomerByEmail(email, token);
    if (existing.success && existing.customerId) {
      return NextResponse.json({ success: true, simulation: false, customerId: existing.customerId });
    }

    const mpRes = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: firstName || 'Cliente',
        last_name: lastName || 'Batatatop',
      }),
    });

    const data = await mpRes.json();

    if (mpRes.ok) {
      return NextResponse.json({ success: true, simulation: false, customerId: data.id });
    }

    // Se falhar por e-mail duplicado, faz busca de recuperação
    if (
      data.cause?.some((c: any) => c.code === 101 || c.code === '101') ||
      data.message?.toLowerCase().includes('already exists')
    ) {
      const retry = await findCustomerByEmail(email, token);
      if (retry.success && retry.customerId) {
        return NextResponse.json({ success: true, simulation: false, customerId: retry.customerId });
      }
    }

    return NextResponse.json({ success: false, error: data.message || 'Erro ao criar cliente no Mercado Pago' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Erro de conexão com o Mercado Pago' });
  }
}
