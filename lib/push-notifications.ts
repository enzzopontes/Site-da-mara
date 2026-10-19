const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const ADMIN_ORDERS_CHANNEL_ID = 'new-orders';

type OrderItem = {
  product_name?: string;
  name?: string;
  quantity?: number;
  product_price?: number;
  price?: number;
  adicionais?: (string | { name?: string; nome?: string })[];
};

type Order = {
  id: string;
  order_number?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  phone?: string | null;
  delivery_type?: string | null;
  customer_address?: string | null;
  customer_complement?: string | null;
  customer_neighborhood?: string | null;
  payment_method?: string | null;
  total_amount?: number | null;
  total?: number | null;
  total_price?: number | null;
  notes?: string | null;
  order_items?: OrderItem[];
};

export function buildNewOrderPushContent(order: Order, items: OrderItem[] = []) {
  const orderLabel = order.order_number
    ? `#${order.order_number}`
    : `#${String(order.id).slice(-4).toUpperCase()}`;

  const customer = order.customer_name || 'Cliente';
  const customerPhone = order.customer_phone || order.phone || '';
  const isRetirada = order.delivery_type === 'retirada' || order.delivery_type === 'pickup';
  const deliveryType = isRetirada ? 'Retirada no Balcão' : 'Entrega Delivery';

  const paymentLabel =
    order.payment_method === 'pix'
      ? 'Pix (Pago)'
      : order.payment_method === 'dinheiro'
      ? 'Dinheiro'
      : order.payment_method?.toLowerCase()?.includes('deb')
      ? 'Cartão de Débito'
      : order.payment_method?.toLowerCase()?.includes('cred')
      ? 'Cartão de Crédito'
      : order.payment_method || 'Cartão';

  const address = order.customer_address
    ? `${order.customer_address}${order.customer_complement ? ` (${order.customer_complement})` : ''}${order.customer_neighborhood ? ` - ${order.customer_neighborhood}` : ''}`
    : isRetirada
    ? 'Loja (Retirada)'
    : 'Endereço não informado';

  const totalFromOrder = order.total_amount ?? order.total ?? order.total_price;
  const totalFromItems = (items || []).reduce((sum, item) => {
    const price = item.product_price ?? item.price ?? 0;
    const qty = item.quantity ?? 1;
    return sum + price * qty;
  }, 0);
  const total = totalFromOrder ?? totalFromItems;
  const totalFmt = total != null
    ? `R$ ${Number(total).toFixed(2).replace('.', ',')}`
    : '';

  const itemLines = (items || []).slice(0, 6).map((item) => {
    const name = item.product_name || item.name || 'Item';
    const qty = item.quantity || 1;
    const adicionais = (item.adicionais || [])
      .map((a) => (typeof a === 'string' ? a : a?.name || a?.nome))
      .filter(Boolean);
    const adicText = adicionais.length ? ` (+ ${adicionais.join(', ')})` : '';
    return `${qty}x ${name}${adicText}`;
  });

  const extraCount = (items || []).length > 6 ? ` (+${items.length - 6} itens)` : '';

  const bodyLines = [
    `${totalFmt} • ${paymentLabel} • ${deliveryType}`,
    `${address}`,
    itemLines.join(' | ') + extraCount,
  ];

  const cleanPhone = (customerPhone || '').trim();
  if (cleanPhone) bodyLines.push(`Contato: ${cleanPhone}`);
  const cleanNotes = (order.notes || '').trim();
  if (cleanNotes) bodyLines.push(`Obs: ${cleanNotes}`);

  const body = bodyLines.filter(Boolean).join('\n');

  return {
    title: `Novo pedido ${orderLabel} • ${customer}`,
    subtitle: `${customer} — ${totalFmt}`,
    body,
    data: {
      orderId: order.id,
      screen: 'admin/pedidos',
      url: '/admin/pedidos',
    },
  };
}

export async function sendExpoPush(messages: Record<string, unknown>[]) {
  if (!messages.length) {
    return { ok: true, sent: 0, result: null };
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return { ok: response.ok, sent: messages.length, result };
}

export function buildExpoPushMessages(
  tokens: string[],
  content: ReturnType<typeof buildNewOrderPushContent>,
) {
  return tokens.map((to) => ({
    to,
    title: content.title,
    subtitle: content.subtitle,
    body: content.body,
    sound: 'new-order.mp3',
    priority: 'high',
    channelId: ADMIN_ORDERS_CHANNEL_ID,
    data: content.data,
    android: {
      channelId: ADMIN_ORDERS_CHANNEL_ID,
      priority: 'max',
      sound: 'new-order.mp3',
      color: '#1A1A1A',
    },
    ios: {
      sound: 'new-order.mp3',
      subtitle: content.subtitle,
    },
  }));
}
