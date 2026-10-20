import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import {
  ADMIN_ORDERS_CHANNEL_ID,
  buildExpoPushMessages,
  buildNewOrderPushContent,
  sendExpoPush,
} from '@/lib/push-notifications';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function getCorsOrigin(req: NextRequest): string {
  const origin = req.headers.get('origin') || '';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const isAllowed =
    !origin ||
    origin === siteUrl ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  return isAllowed && origin ? origin : (siteUrl || '*');
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configuradas');
  }

  return createClient(url, key);
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(req),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: NextRequest) {
  const corsOrigin = getCorsOrigin(req);
  const corsHeaders = { 'Access-Control-Allow-Origin': corsOrigin };

  try {
    const authHeader = req.headers.get('authorization') || '';
    const userJwt = authHeader.replace(/^Bearer\s+/i, '');

    if (!userJwt) {
      return NextResponse.json(
        { success: false, error: 'Token de autenticação obrigatório' },
        { status: 401, headers: corsHeaders },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(userJwt);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuário não autenticado' },
        { status: 401, headers: corsHeaders },
      );
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId obrigatorio' },
        { status: 400, headers: corsHeaders },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, user_id, customer_name, customer_phone, status, metadata, order_number,
        delivery_type, customer_address, customer_complement, customer_neighborhood,
        payment_method, total_amount, notes,
        order_items (id, product_name, quantity, product_price, adicionais)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Pedido nao encontrado' },
        { status: 404, headers: corsHeaders },
      );
    }

    // Dono do pedido OU admin pelos e-mails mestres ou profile.role
    let isAdmin = ADMIN_EMAILS.includes((user.email || '').toLowerCase());
    if (!isAdmin) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (prof?.role === 'admin') {
        isAdmin = true;
      }
    }
    const isOwner = order.user_id === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado: você não é dono nem admin deste pedido' },
        { status: 403, headers: corsHeaders },
      );
    }

    // Pedido DEVE estar em status 'pending' e NÃO online (pedidos online geram push no webhook)
    const isPaymentOnline =
      order.metadata?.payment_online === true ||
      !!order.metadata?.paid_at ||
      !!order.metadata?.mp_payment_id;

    if (order.status !== 'pending' || isPaymentOnline) {
      return NextResponse.json(
        {
          success: false,
          error: 'Pedido não elegível para notificação manual (deve ter status "pending" e pagamento offline)',
        },
        { status: 409, headers: corsHeaders },
      );
    }

    // Trava anti-repetição: se já foi notificado, responder 200 sem enviar de novo
    if (order.metadata?.admin_push_sent) {
      return NextResponse.json(
        {
          success: true,
          message: 'Notificação já enviada anteriormente',
          skipped: true,
        },
        { status: 200, headers: corsHeaders },
      );
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('admin_push_tokens')
      .select('expo_push_token');

    if (tokenError) {
      return NextResponse.json(
        { success: false, error: tokenError.message },
        { status: 500, headers: corsHeaders },
      );
    }

    const uniqueAdminTokens = [
      ...new Set((tokens || []).map((t) => t.expo_push_token).filter(Boolean)),
    ] as string[];

    // Buscar tokens do cliente cadastrados em user_push_tokens
    const { data: userTokenRows } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('user_id', order.user_id);

    const uniqueUserTokens = [
      ...new Set(
        (userTokenRows || [])
          .map((t) => t.expo_push_token)
          .filter(Boolean)
      ),
    ] as string[];

    // Marcar como notificado via rpc merge_order_metadata ANTES do envio para travar concorrência
    await supabase.rpc('merge_order_metadata', {
      order_id: order.id,
      patch: {
        admin_push_sent: true,
        admin_push_sent_at: new Date().toISOString(),
      },
    });

    let adminMessages: any[] = [];
    let customerMessages: any[] = [];
    let pushResult: any = null;
    let customerPushResult: any = null;

    try {
      const content = buildNewOrderPushContent(order, order.order_items || []);
      adminMessages = buildExpoPushMessages(uniqueAdminTokens, content);

      const etaMin = order.metadata?.eta_minutes || 40;
      const etaMax = etaMin + 20;
      customerMessages = uniqueUserTokens.map((to) => ({
        to,
        title: 'Pedido confirmado',
        body: `Estamos preparando seu pedido. Previsão de entrega: ${etaMin} a ${etaMax} min`,
        sound: 'default',
        priority: 'high',
        data: {
          orderId: order.id,
          screen: 'pedidos',
          url: `/pedidos/${order.id}`,
        },
        android: {
          color: '#FFB800',
          priority: 'high',
        },
      }));

      const [adminRes, custRes] = await Promise.all([
        sendExpoPush(adminMessages),
        sendExpoPush(customerMessages),
      ]);
      pushResult = adminRes;
      customerPushResult = custRes;

      if (!pushResult.ok && !customerPushResult.ok) {
        throw new Error('Falha retornada pelo serviço Expo Push');
      }
    } catch (pushErr: any) {
      // Se o envio falhar, regrava admin_push_sent = false
      await supabase.rpc('merge_order_metadata', {
        order_id: order.id,
        patch: {
          admin_push_sent: false,
          admin_push_failed_at: new Date().toISOString(),
        },
      });
      return NextResponse.json(
        { success: false, error: 'Falha no envio de push: ' + (pushErr?.message || 'erro desconhecido') },
        { status: 500, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      {
        success: true,
        sent_admin: adminMessages.length,
        sent_customer: customerMessages.length,
        channelId: ADMIN_ORDERS_CHANNEL_ID,
        push: pushResult,
        push_customer: customerPushResult,
      },
      { headers: corsHeaders },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: corsHeaders },
    );
  }
}
