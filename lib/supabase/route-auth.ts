import type { NextRequest } from "next/server"
import { createServerClient } from "./server"

/**
 * Autentica o usuário em Route Handlers aceitando:
 * 1) Header `Authorization: Bearer <access_token>` (contrato do App Mobile React Native e chamadas autenticadas)
 * 2) Cookies SSR (`@supabase/ssr`, usado pelo navegador Web)
 */
export async function authenticateRequestUser(req: NextRequest, serviceClient: any) {
  const authHeader = req.headers.get("authorization") || ""
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim()

  if (bearerToken && serviceClient) {
    try {
      const { data, error } = await serviceClient.auth.getUser(bearerToken)
      if (!error && data?.user) return data.user
    } catch {}
  }

  try {
    const serverClient = await createServerClient()
    const { data, error } = await serverClient.auth.getUser()
    if (!error && data?.user) return data.user
  } catch {}

  return null
}

/**
 * Validação matemática dos dígitos verificadores do CPF (11 dígitos).
 */
export function isValidCpfDigits(rawCpf: string): boolean {
  const digits = String(rawCpf || "").replace(/\D/g, "")
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== Number(digits[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === Number(digits[10])
}
