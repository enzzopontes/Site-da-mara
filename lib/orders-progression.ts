import { ORDERS_CONFIG } from './orders-config';

export const STATUS_RANK: Record<string, number> = {
  pending: 1,
  preparing: 2,
  ready: 3,
  delivered: 4,
};

/**
 * Retorna o timestamp em ms da base de tempo do pedido:
 * paid_at ?? created_at.
 */
export function getTimeBase(order: any): number {
  const timeStr = order?.metadata?.paid_at ?? order?.created_at ?? order?.createdAt;
  const time = new Date(timeStr).getTime();
  return isNaN(time) ? Date.now() : time;
}

/**
 * Retorna se orderA é cronologicamente anterior a orderB.
 * Desempate por ID alfanumérico.
 */
export function isAnterior(orderA: any, orderB: any): boolean {
  const timeA = getTimeBase(orderA);
  const timeB = getTimeBase(orderB);
  if (timeA !== timeB) {
    return timeA < timeB;
  }
  return String(orderA?.id || '') < String(orderB?.id || '');
}

/**
 * Função pura e testável que atribui o ETA em minutos com base na fila:
 * eta_minutes = min(BASE + STEP * pedidosNaFrente, MAX)
 *
 * pedidosNaFrente = pedidos 'pending' ou 'preparing' cuja base de tempo
 * (paid_at ?? created_at) é anterior à do pedido (desempate por ID).
 */
export function assignEta(order: any, activeOrders: any[] = []): number {
  if (order?.metadata?.eta_minutes) {
    return Number(order.metadata.eta_minutes);
  }

  const pedidosNaFrente = activeOrders.filter((other) => {
    if (!other || other.id === order.id) return false;
    const isQualifyingStatus = other.status === 'pending' || other.status === 'preparing';
    if (!isQualifyingStatus) return false;
    return isAnterior(other, order);
  }).length;

  const eta = Math.min(
    ORDERS_CONFIG.BASE_MINUTES + ORDERS_CONFIG.STEP_MINUTES * pedidosNaFrente,
    ORDERS_CONFIG.MAX_MINUTES
  );

  return eta;
}

/**
 * Função pura que determina o status alvo com base nas regras:
 * - Ignora awaiting_payment, cancelled e delivered.
 * - pending -> preparing: >= 1 min.
 * - preparing -> ready: >= eta * READY_FRACTION (ex.: 15 * 0.4 = 6 min).
 * - ready -> delivered: em eta minutos, SOMENTE se AUTO_DELIVERED = true.
 * - Só AVANÇA na ordem: se o status atual já está à frente ou igual, NÃO altera.
 */
export function getTargetStatus(order: any, now: number | Date = Date.now()): string {
  if (
    !order ||
    order.status === 'awaiting_payment' ||
    order.status === 'cancelled' ||
    order.status === 'delivered'
  ) {
    return order?.status;
  }

  const currentRank = STATUS_RANK[order.status];
  if (!currentRank) {
    return order.status;
  }

  const nowMs = typeof now === 'number' ? now : now.getTime();
  const baseTimeMs = getTimeBase(order);
  const elapsedMs = Math.max(0, nowMs - baseTimeMs);
  const elapsedMinutes = elapsedMs / (60 * 1000);

  const eta = Number(order.metadata?.eta_minutes) || ORDERS_CONFIG.BASE_MINUTES;

  let calculatedTarget = 'pending';
  if (ORDERS_CONFIG.AUTO_DELIVERED && elapsedMinutes >= eta) {
    calculatedTarget = 'delivered';
  } else if (elapsedMinutes >= eta * ORDERS_CONFIG.READY_FRACTION) {
    calculatedTarget = 'ready';
  } else if (elapsedMinutes >= ORDERS_CONFIG.PENDING_TO_PREPARING_MINUTES) {
    calculatedTarget = 'preparing';
  }

  const targetRank = STATUS_RANK[calculatedTarget] || 0;

  // Só avança na ordem pending < preparing < ready < delivered
  if (targetRank > currentRank) {
    return calculatedTarget;
  }

  return order.status;
}

/**
 * Executa a progressão de pedidos com escritas condicionais e sem vazamento de dados pessoais.
 * Reutilizada na rota cron /api/orders/progress e no OrdersManager do site.
 */
export async function progressActiveOrders(supabaseClient: any, now: number | Date = Date.now()) {
  const { data: rawOrders, error } = await supabaseClient
    .from('orders')
    .select('id, status, created_at, updated_at, metadata')
    .in('status', ['pending', 'preparing', 'ready'])
    .order('created_at', { ascending: true });

  if (error || !rawOrders) {
    console.error('[progress] Erro ao buscar pedidos ativos:', error?.message);
    return { checked: 0, updated: 0, etaAssigned: 0 };
  }

  const orders = [...rawOrders];
  let checked = orders.length;
  let updated = 0;
  let etaAssigned = 0;

  // 1. Atribui ETA aos pedidos sem eta_minutes em ordem cronológica de base de tempo
  const unassignedOrders = orders
    .filter((o) => !o.metadata?.eta_minutes)
    .sort((a, b) => (isAnterior(a, b) ? -1 : 1));

  for (const order of unassignedOrders) {
    const eta = assignEta(order, orders);
    const updatedMetadata = {
      ...(order.metadata || {}),
      eta_minutes: eta,
    };

    // Gravação condicional do ETA
    const { error: etaError, count } = await supabaseClient
      .from('orders')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      }, { count: 'exact' })
      .eq('id', order.id)
      .eq('status', order.status);

    if (!etaError && (count === null || count > 0)) {
      order.metadata = updatedMetadata;
      etaAssigned++;
      console.log(`[progress] Pedido id=${order.id} status=${order.status} ETA atribuído: ${eta} min`);
    }
  }

  // 2. Avalia e avança status de cada pedido
  for (const order of orders) {
    const targetStatus = getTargetStatus(order, now);

    if (targetStatus !== order.status) {
      const updatedMetadata = {
        ...(order.metadata || {}),
        statusUpdatedAt: new Date().toISOString(),
      };

      // Atualização condicional (.eq('id').eq('status')) para evitar conflito concorrente
      const { error: updateError, count } = await supabaseClient
        .from('orders')
        .update({
          status: targetStatus,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        }, { count: 'exact' })
        .eq('id', order.id)
        .eq('status', order.status);

      if (!updateError && (count === null || count > 0)) {
        console.log(`[progress] Pedido id=${order.id} avançou: ${order.status} -> ${targetStatus}`);
        order.status = targetStatus;
        order.metadata = updatedMetadata;
        updated++;
      }
    }
  }

  return { checked, updated, etaAssigned };
}
