import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint desativado (410 Gone). A progressão de pedidos agora é gerenciada exclusivamente pelo banco de dados (pg_cron).' },
    { status: 410 }
  );
}

export async function GET() {
  return POST();
}
