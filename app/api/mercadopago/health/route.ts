import { NextResponse } from 'next/server';

// ROTA TEMPORÁRIA de diagnóstico para validar a presença das variáveis de ambiente na Vercel.
// Retorna APENAS booleanos indicando se as variáveis existem (NUNCA os valores).
export async function GET() {
  return NextResponse.json({
    accessToken: !!process.env.MERCADO_PAGO_ACCESS_TOKEN,
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
