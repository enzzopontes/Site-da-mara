import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function authenticateUser(req: NextRequest, supabase: any) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST: Salvar cartão no Mercado Pago e registrar no banco
export async function POST(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'MERCADO_PAGO_ACCESS_TOKEN ausente' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase não configurado' }, { status: 500 });
    }

    const user = await authenticateUser(req, supabase);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { token, payment_method_id, cardholder_name, is_default } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token do cartão obrigatório' }, { status: 400 });
    }

    // Limite de 5 cartões por usuário
    const { count, error: countErr } = await supabase
      .from('payment_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countErr) {
      return NextResponse.json({ success: false, error: 'Erro ao verificar cartões' }, { status: 500 });
    }

    if (count !== null && count >= 5) {
      return NextResponse.json({ success: false, error: 'Limite de 5 cartões atingido' }, { status: 400 });
    }

    // Resolver mp_customer_id
    let mpCustomerId: string | null = null;

    // 1. Verificar se usuário já possui cartão salvo no banco com mp_customer_id
    const { data: existingCard } = await supabase
      .from('payment_cards')
      .select('mp_customer_id')
      .eq('user_id', user.id)
      .not('mp_customer_id', 'is', null)
      .limit(1)
      .maybeSingle();

    if (existingCard?.mp_customer_id) {
      mpCustomerId = existingCard.mp_customer_id;
    } else {
      // 2. Buscar customer no Mercado Pago por e-mail
      const email = user.email || '';
      if (!email) {
        return NextResponse.json({ success: false, error: 'E-mail do usuário não encontrado' }, { status: 400 });
      }

      const searchRes = await fetch(
        `https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          mpCustomerId = searchData.results[0].id;
        }
      }

      // 3. Se não existir no MP, criar novo customer
      if (!mpCustomerId) {
        const createRes = await fetch('https://api.mercadopago.com/v1/customers', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            first_name: user.user_metadata?.nome || user.user_metadata?.full_name || email.split('@')[0],
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          console.error('[cards] Falha ao criar customer no MP:', errData);
          const detail = errData?.cause?.[0]?.description || errData?.message || '';
          return NextResponse.json({
            success: false,
            error: detail ? `Falha ao registrar cliente no Mercado Pago (${detail})` : 'Falha ao registrar cliente no Mercado Pago',
            details: errData,
          }, { status: 502 });
        }

        const newCustomer = await createRes.json();
        mpCustomerId = newCustomer.id;
      }
    }

    if (!mpCustomerId) {
      return NextResponse.json({ success: false, error: 'Não foi possível identificar o customer_id' }, { status: 500 });
    }

    // Salvar cartão no Mercado Pago: POST /v1/customers/{customer_id}/cards
    const mpCardRes = await fetch(`https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!mpCardRes.ok) {
      const cardErr = await mpCardRes.json().catch(() => ({}));
      console.error('[cards] Falha ao salvar cartão no MP:', cardErr);
      const isCredentialError = cardErr?.message?.toLowerCase().includes('credential') || cardErr?.error === 'bad_request' && cardErr?.message === 'Invalid credentials';
      const detail = isCredentialError
        ? 'Chave pública do app e token de acesso do servidor pertencem a contas diferentes no Mercado Pago.'
        : (cardErr?.cause?.[0]?.description || cardErr?.message || '');

      return NextResponse.json({
        success: false,
        error: detail ? `Falha ao registrar cartão no Mercado Pago: ${detail}` : 'Falha ao registrar cartão no Mercado Pago',
        details: cardErr,
      }, { status: 502 });
    }

    const mpCard = await mpCardRes.json();

    // Se marcado como padrão, desmarcar outros
    if (is_default) {
      await supabase
        .from('payment_cards')
        .update({ is_default: false })
        .eq('user_id', user.id);
    }

    // Inserir em payment_cards
    const cardData = {
      user_id: user.id,
      mp_customer_id: mpCustomerId,
      mp_card_id: String(mpCard.id),
      last_four: mpCard.last_four_digits || String(mpCard.id).slice(-4),
      payment_method_id: payment_method_id || mpCard.payment_method?.id || 'visa',
      card_type: mpCard.payment_method?.payment_type_id || 'credit_card',
      cardholder_name: cardholder_name || mpCard.cardholder?.name || 'Cliente',
      is_default: !!is_default || count === 0,
    };

    const { data: insertedCard, error: insertError } = await supabase
      .from('payment_cards')
      .insert(cardData)
      .select()
      .single();

    if (insertError) {
      console.error('[cards] Falha ao inserir cartão no banco, executando compensação no MP:', insertError);
      // Transação compensatória: remover cartão do Mercado Pago
      try {
        await fetch(`https://api.mercadopago.com/v1/customers/${mpCustomerId}/cards/${mpCard.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (compErr: any) {
        console.error('[cards] Falha na exclusão compensatória:', compErr?.message);
      }
      return NextResponse.json({ success: false, error: 'Falha ao salvar cartão no banco de dados' }, { status: 500 });
    }

    return NextResponse.json({ success: true, card: insertedCard }, { status: 201 });
  } catch (err: any) {
    console.error('[cards] Exceção em POST:', err?.message);
    return NextResponse.json({ success: false, error: err?.message || 'Erro interno' }, { status: 500 });
  }
}

// PATCH: Alternar cartão padrão
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ success: false, error: 'Supabase não configurado' }, { status: 500 });

    const user = await authenticateUser(req, supabase);
    if (!user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });

    const { cardId } = await req.json();
    if (!cardId) return NextResponse.json({ success: false, error: 'cardId obrigatório' }, { status: 400 });

    // Verificar se cartão pertence ao usuário
    const { data: card } = await supabase
      .from('payment_cards')
      .select('id')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ success: false, error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Desmarcar todos e marcar o selecionado
    await supabase.from('payment_cards').update({ is_default: false }).eq('user_id', user.id);
    await supabase.from('payment_cards').update({ is_default: true }).eq('id', cardId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

// DELETE: Remover cartão do MP e do banco
export async function DELETE(req: NextRequest) {
  try {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return NextResponse.json({ success: false, error: 'MERCADO_PAGO_ACCESS_TOKEN ausente' }, { status: 500 });

    const supabase = getSupabaseAdmin();
    if (!supabase) return NextResponse.json({ success: false, error: 'Supabase não configurado' }, { status: 500 });

    const user = await authenticateUser(req, supabase);
    if (!user) return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });

    const cardId = req.nextUrl.searchParams.get('cardId');
    if (!cardId) return NextResponse.json({ success: false, error: 'cardId obrigatório' }, { status: 400 });

    const { data: card } = await supabase
      .from('payment_cards')
      .select('id, mp_customer_id, mp_card_id, is_default')
      .eq('id', cardId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!card) {
      return NextResponse.json({ success: false, error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Deletar no MP se tiver customer e card
    if (card.mp_customer_id && card.mp_card_id) {
      try {
        await fetch(`https://api.mercadopago.com/v1/customers/${card.mp_customer_id}/cards/${card.mp_card_id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch (mpErr: any) {
        console.warn('[cards] Falha não impeditiva ao remover cartão do MP:', mpErr?.message);
      }
    }

    // Deletar do banco
    await supabase.from('payment_cards').delete().eq('id', cardId);

    // Se o removido era padrão, promover outro se houver
    if (card.is_default) {
      const { data: nextCard } = await supabase
        .from('payment_cards')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (nextCard) {
        await supabase.from('payment_cards').update({ is_default: true }).eq('id', nextCard.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
