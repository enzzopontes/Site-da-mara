import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Endpoint desativado (410 Gone). O controle de status da loja é gerenciado pelo banco de dados (pg_cron)." },
    { status: 410 }
  );
}

export async function POST() {
  return GET();
}
