import crypto from 'node:crypto'

/**
 * Módulo de Segurança de Transporte, Borda e Headers (Fase 3)
 */

export function getSecurityHeadersList() {
  return [
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(self)',
    },
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com; frame-src 'self' https://sdk.mercadopago.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
    },
  ]
}

export function evaluateOriginForCors(origin, allowedOrigins) {
  if (!origin || typeof origin !== 'string') {
    return { isAllowed: false }
  }

  const cleanOrigin = origin.trim().toLowerCase()

  // Proibir wildcards permissivos
  if (cleanOrigin === '*' || cleanOrigin === 'null') {
    return { isAllowed: false }
  }

  const isMatched = allowedOrigins.some((allowed) => {
    return cleanOrigin === allowed.toLowerCase().trim()
  })

  return {
    isAllowed: isMatched,
    origin: isMatched ? origin : null,
  }
}

export function validateWebhookSignature({ secret, signatureHeader, requestId = '', dataId, toleranceSeconds = 600 }) {
  if (!secret || !signatureHeader || !dataId) {
    return { isValid: false, error: 'Parâmetros de assinatura ausentes' }
  }

  // Extrair ts e v1
  const parts = {}
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }

  const ts = parts['ts']
  const v1 = parts['v1']

  if (!ts || !v1) {
    return { isValid: false, error: 'Formato de assinatura inválido' }
  }

  // Validação de tolerância a replay attack
  const rawTs = Number(ts)
  const tsSeconds = rawTs > 1e11 ? Math.floor(rawTs / 1000) : rawTs
  const nowSeconds = Math.floor(Date.now() / 1000)

  if (!Number.isFinite(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > toleranceSeconds) {
    return { isValid: false, error: 'Timestamp fora da janela de tolerância (replay attack)' }
  }

  // Cálculo HMAC com comparação em tempo constante
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const computedHmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const computedBuf = Buffer.from(computedHmac, 'utf8')
  const providedBuf = Buffer.from(v1, 'utf8')

  if (computedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(computedBuf, providedBuf)) {
    return { isValid: false, error: 'Assinatura HMAC inválida' }
  }

  return { isValid: true }
}
