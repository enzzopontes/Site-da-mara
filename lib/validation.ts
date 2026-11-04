/**
 * Utilitários de Validação de Dados (Segurança Camada 3)
 * Focado em impedir dados maliciosos ou inválidos.
 */

import {
  sanitizeString as secureSanitizeString,
  validatePhone as secureValidatePhone,
  validateOrderPayload,
} from "./security-validation"

export const validatePhone = secureValidatePhone

export const validateEmail = (email: string): boolean => {
  if (typeof email !== "string") return false
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email.trim()) && email.length <= 254
}

export const sanitizeString = secureSanitizeString

export const validateOrder = (order: any): { isValid: boolean; error?: string } => {
  return validateOrderPayload(order)
}
