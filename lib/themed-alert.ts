export type ThemedAlertType = "success" | "error" | "warning" | "info"

export interface ThemedAlertOptions {
  duration?: number
}

export interface ThemedAlertPayload {
  id: number
  title?: string
  message?: string
  type: ThemedAlertType
  duration: number
}

export type AlertEvent =
  | { action: "show"; payload: ThemedAlertPayload }
  | { action: "hide"; id?: number | string }

export const DEFAULT_ALERT_DURATION = 3800

export const HIDDEN_GENERIC_TITLES = [
  "Erro",
  "Atenção",
  "Alerta",
  "Aviso",
  "Ops!",
]

const SUCCESS_KEYWORDS = [
  "sucesso",
  "confirmado",
  "atualizado",
  "salvo",
  "aplicado",
  "copiado",
  "adicionado",
  "enviado",
]

const NEGATIVE_KEYWORDS = [
  "erro",
  "falha",
  "atenção",
  "aviso",
  "alerta",
  "ops",
  "não foi possível",
  "nao foi possivel",
  "não ",
  "nao ",
  "inválid",
  "invalid",
  "recusad",
  "negad",
  "expirou",
  "expirad",
  "indisponível",
  "indisponivel",
]

export function isSuccessTone(title?: string, message?: string): boolean {
  const text = `${title ?? ""} ${message ?? ""}`.toLowerCase()
  if (NEGATIVE_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return false
  }
  return SUCCESS_KEYWORDS.some((keyword) => text.includes(keyword))
}

function triggerHaptic(type: ThemedAlertType): void {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      if (type === "success") {
        navigator.vibrate(35)
      } else if (type === "error" || type === "warning") {
        navigator.vibrate([40, 30, 40])
      }
    } catch {
      // Previne falha em navegadores onde a API é bloqueada por política de segurança/permissão
    }
  }
}

const listeners = new Set<(event: AlertEvent) => void>()
let nextId = 0

function emit(event: AlertEvent): void {
  listeners.forEach((listener) => {
    listener(event)
  })
}

export function subscribeThemedAlert(
  listener: (event: AlertEvent) => void
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function showThemedAlert(
  title?: string,
  message?: string,
  type?: ThemedAlertType,
  options?: ThemedAlertOptions
): number {
  const resolvedType: ThemedAlertType =
    type ?? (isSuccessTone(title, message) ? "success" : "error")

  triggerHaptic(resolvedType)

  nextId += 1
  const id = nextId

  emit({
    action: "show",
    payload: {
      id,
      title,
      message,
      type: resolvedType,
      duration: options?.duration ?? DEFAULT_ALERT_DURATION,
    },
  })

  return id
}

export function showSuccessAlert(
  message: string,
  title = "Sucesso",
  options?: ThemedAlertOptions
): number {
  return showThemedAlert(title, message, "success", options)
}

export function showErrorAlert(
  message: string,
  title = "Erro",
  options?: ThemedAlertOptions
): number {
  return showThemedAlert(title, message, "error", options)
}

export function showWarningAlert(
  message: string,
  title = "Atenção",
  options?: ThemedAlertOptions
): number {
  return showThemedAlert(title, message, "warning", options)
}

export function showInfoAlert(
  message: string,
  title?: string,
  options?: ThemedAlertOptions
): number {
  return showThemedAlert(title, message, "info", options)
}

export function hideThemedAlert(id?: number | string): void {
  emit({ action: "hide", id })
}
