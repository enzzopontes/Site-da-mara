import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint desativado (410 Gone). Gerenciamento de clientes e cartões unificado em /api/mercadopago/cards.' },
    { status: 410 }
  );
}

export async function GET() {
  return POST();
}
