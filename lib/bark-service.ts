export interface BarkOrderData {
  id: string
  order_number?: number | string | null
  customer_name?: string | null
  total_amount?: number | null
  total?: number | null
  payment_method?: string | null
}

const BARK_PUSH_URL = "https://api.day.app/push"
const DEFAULT_ADMIN_URL = "https://batatatopiacanga.com.br/admin"

export function getBarkDeviceKey(): string {
  return (
    process.env.BARK_DEVICE_KEY ||
    process.env.NEXT_PUBLIC_BARK_DEVICE_KEY ||
    "rhdPArWptmFfukNzm25fEg"
  ).trim()
}

export function formatBarkPayment(paymentMethod?: string | null): string {
  if (!paymentMethod) return "Pagamento não informado"
  const p = paymentMethod.toLowerCase()
  if (p === "pix") return "Pix"
  if (p === "dinheiro") return "Dinheiro"
  if (p.includes("deb")) return "Cartão de Débito"
  if (p.includes("cred")) return "Cartão de Crédito"
  return paymentMethod
}

export function formatBarkTotal(total?: number | null): string {
  const val = Number(total || 0)
  return val.toFixed(2).replace(".", ",")
}

export async function sendBarkNotification(order: BarkOrderData): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceKey = getBarkDeviceKey()
    if (!deviceKey) {
      console.warn("[BarkService] BARK_DEVICE_KEY não configurada. Notificação ignorada.")
      return { success: false, error: "BARK_DEVICE_KEY_MISSING" }
    }

    const orderNumber = order.order_number
      ? String(order.order_number)
      : order.id.slice(0, 5).toUpperCase()
    const customer = (order.customer_name || "Cliente").trim()
    const totalFmt = formatBarkTotal(order.total_amount ?? order.total)
    const payment = formatBarkPayment(order.payment_method)

    const payload = {
      device_key: deviceKey,
      title: "🥔🚨 NOVO PEDIDO NA BATATA TOP!",
      body: `Pedido #${orderNumber} - Cliente: ${customer} | Total: R$ ${totalFmt} (${payment})`,
      level: "critical",
      volume: 10,
      call: "1",
      sound: "alarm",
      group: "Pedidos Batata Top",
      url: DEFAULT_ADMIN_URL,
    }

    const res = await fetch(BARK_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      console.warn(`[BarkService] Resposta com erro ${res.status}: ${errText}`)
      return { success: false, error: `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err: any) {
    console.error("[BarkService] Falha segura ao enviar notificação Bark:", err?.message || err)
    return { success: false, error: err?.message || "unknown_error" }
  }
}

export async function sendBarkTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceKey = getBarkDeviceKey()
    if (!deviceKey) {
      return { success: false, error: "BARK_DEVICE_KEY não está configurada no ambiente." }
    }

    const payload = {
      device_key: deviceKey,
      title: "🥔🚨 TESTE DE ALARME CRÍTICO",
      body: "Este é um teste do alarme sonoro do iPhone para novos pedidos na Batata Top!",
      level: "critical",
      volume: 10,
      call: "1",
      sound: "alarm",
      group: "Pedidos Batata Top",
      url: DEFAULT_ADMIN_URL,
    }

    const res = await fetch(BARK_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return { success: false, error: `HTTP ${res.status}: ${errText}` }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || "Falha na comunicação com o Bark" }
  }
}
