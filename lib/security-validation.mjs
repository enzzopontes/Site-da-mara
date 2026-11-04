/**
 * Módulo de Validação e Sanitização de Entrada de Dados (Fase 2)
 */

const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function sanitizeString(input) {
  if (typeof input !== 'string') return ''

  // 1. Remove null bytes e caracteres de controle perigosos
  let clean = input.replace(/\0/g, '')

  // 2. Remove blocos e tags executáveis maliciosos (script, iframe, style, etc.)
  clean = clean.replace(/<\s*(?:script|iframe|style|object|embed|svg|math|applet|form)[^>]*>[\s\S]*?<\s*\/\s*(?:script|iframe|style|object|embed|svg|math|applet|form)\s*>/gi, '')
  clean = clean.replace(/<\s*(?:script|iframe|style|object|embed|svg|math|applet|form|input|button|link|meta)[^>]*\/?>/gi, '')

  // 3. Converte caracteres perigosos residuais em entidades HTML seguras
  clean = clean.replace(/[&<>"']/g, (match) => HTML_ENTITY_MAP[match] || match)

  return clean.trim()
}

export function sanitizeFileName(fileName) {
  if (typeof fileName !== 'string') return 'unnamed'

  // Remove qualquer caminho relativo ou absoluto (path traversal)
  const basename = fileName.split(/[/\\]/).pop() || 'unnamed'

  // Mantém apenas caracteres alfanuméricos, pontos, hífens e sublinhados
  const safe = basename.replace(/[^a-zA-Z0-9._-]/g, '')

  return safe.length > 0 ? safe : 'unnamed'
}

export function validatePhone(phone) {
  if (typeof phone !== 'string') return false
  const digits = phone.replace(/\D/g, '')
  // DDD brasileiro (2 dígitos) + número fixo (8 dígitos) ou celular (9 dígitos)
  return digits.length === 10 || digits.length === 11
}

export function validateOrderPayload(order) {
  if (!order || typeof order !== 'object') {
    return { isValid: false, error: 'Payload de pedido inválido' }
  }

  const customerName = String(order.customerName || '').trim()
  if (customerName.length < 3 || customerName.length > 100) {
    return { isValid: false, error: 'Nome do cliente deve ter entre 3 e 100 caracteres' }
  }

  if (!validatePhone(String(order.customerPhone || ''))) {
    return { isValid: false, error: 'Telefone do cliente inválido' }
  }

  if (!Array.isArray(order.items) || order.items.length === 0 || order.items.length > 50) {
    return { isValid: false, error: 'O pedido deve conter entre 1 e 50 itens' }
  }

  for (const item of order.items) {
    if (!item || typeof item !== 'object') {
      return { isValid: false, error: 'Item do pedido inválido' }
    }

    const qty = Number(item.quantity)
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return { isValid: false, error: 'Quantidade de item inválida (deve ser entre 1 e 99)' }
    }

    if (Array.isArray(item.adicionais)) {
      for (const add of item.adicionais) {
        const addQty = Number(add.quantity || 1)
        if (!Number.isInteger(addQty) || addQty < 1 || addQty > 20) {
          return { isValid: false, error: 'Quantidade de adicional inválida' }
        }
      }
    }
  }

  const deliveryType = order.deliveryType || 'delivery'
  if (deliveryType === 'delivery') {
    const address = String(order.customerAddress || '').trim()
    if (address.length < 10 || address.length > 250) {
      return { isValid: false, error: 'Endereço de entrega deve ter entre 10 e 250 caracteres' }
    }
  }

  return { isValid: true }
}

export function validateImagePayload(mimeType, base64Data) {
  if (typeof mimeType !== 'string' || typeof base64Data !== 'string') {
    return { isValid: false, error: 'Dados de imagem inválidos' }
  }

  const cleanMime = mimeType.toLowerCase().trim()

  // Bloqueio explícito de vetores SVG (armazenamento de scripts)
  if (cleanMime.includes('svg') || cleanMime.includes('xml')) {
    return { isValid: false, error: 'Formato SVG/XML não permitido por motivos de segurança' }
  }

  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimes.includes(cleanMime)) {
    return { isValid: false, error: 'Formato de imagem não suportado' }
  }

  // Validação de Magic Bytes no cabeçalho Base64
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim()

  const magicHeaders = {
    'image/jpeg': ['/9j/'],
    'image/png': ['iVBORw0KGgo'],
    'image/webp': ['UklGR'],
    'image/gif': ['R0lGOD'],
  }

  const expectedPrefixes = magicHeaders[cleanMime] || []
  const matchesMagic = expectedPrefixes.some((prefix) => cleanBase64.startsWith(prefix))

  if (!matchesMagic) {
    return { isValid: false, error: 'Assinatura binária do arquivo não corresponde ao tipo declarado' }
  }

  return { isValid: true }
}
