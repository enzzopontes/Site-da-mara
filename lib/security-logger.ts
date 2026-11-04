/**
 * Módulo de Observabilidade e Logging Seguro de Eventos (Fase 7)
 * Sanitiza automaticamente segredos e PII antes do log.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'token',
  'secret',
  'key',
  'access_token',
  'cvv',
  'card_cvv',
  'card_number',
  'numero_cartao',
  'authorization',
  'service_role',
  'cookie',
])

export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data
  if (typeof data !== 'object') {
    if (typeof data === 'string') {
      // Mascarar cartões de crédito (13 a 19 dígitos)
      return data.replace(/\b(?:\d{4}[ -]?){3}\d{1,4}\b/g, '[REDACTED_CARD]')
    }
    return data
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item))
  }

  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(data)) {
    const lowerKey = k.toLowerCase().trim()
    if (SENSITIVE_KEYS.has(lowerKey)) {
      clean[k] = '[REDACTED]'
    } else if (typeof v === 'string') {
      let val = v.replace(/\b(?:\d{4}[ -]?){3}\d{1,4}\b/g, '[REDACTED_CARD]')
      if (lowerKey.includes('cpf') && val.replace(/\D/g, '').length === 11) {
        val = val.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '$1.***.***-$4')
      }
      clean[k] = val
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeLogData(v)
    } else {
      clean[k] = v
    }
  }

  return clean
}

export function createSecurityLogEntry(eventType: string, details: Record<string, any> = {}) {
  return {
    timestamp: new Date().toISOString(),
    event_type: eventType,
    environment: process.env.NODE_ENV || 'development',
    payload: sanitizeLogData(details),
  }
}
