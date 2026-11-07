import { z } from "zod"

export const phoneRegex = /^(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))$/

export const addressSelectionSchema = z.object({
  // Dados do mapa / geocodificação
  street: z
    .string()
    .min(2, "O nome da rua/logradouro é obrigatório."),
  neighborhood: z
    .string()
    .min(2, "O bairro precisa ter pelo menos 2 caracteres."),
  city: z
    .string()
    .min(2, "A cidade é obrigatória."),
  state: z
    .string()
    .length(2, "UF inválida."),
  cep: z
    .string()
    .min(8, "CEP inválido."),
  latitude: z
    .number()
    .min(-90, "Latitude inválida.")
    .max(90, "Latitude inválida."),
  longitude: z
    .number()
    .min(-180, "Longitude inválida.")
    .max(180, "Longitude inválida."),
  formatted: z.string().optional(),

  // Campos manuais de endereço
  number: z.string().optional(),
  semNumero: z.boolean().default(false),
  complement: z.string().optional(),
  semComplemento: z.boolean().default(false),
  reference_point: z
    .string()
    .max(280, "Ponto de referência pode ter no máximo 280 caracteres.")
    .optional(),
  label: z.enum(["casa", "trabalho"]).nullable().optional(),

  // Dados de contato
  fullName: z
    .string()
    .min(3, "Informe seu nome completo (pelo menos 3 caracteres).")
    .refine((val) => val.trim().split(" ").length >= 2, {
      message: "Por favor, informe seu sobrenome também.",
    }),
  phone: z
    .string()
    .min(14, "Telefone incompleto. Use o formato (DDD) 9XXXX-XXXX.")
    .refine((val) => {
      const clean = val.replace(/\D/g, "")
      return clean.length === 10 || clean.length === 11
    }, {
      message: "Número de telefone deve conter DDD e 8 ou 9 dígitos.",
    }),
}).superRefine((data, ctx) => {
  // Validação de número
  if (!data.semNumero && (!data.number || data.number.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["number"],
      message: "Preencha o número ou marque 'Endereço sem número'.",
    })
  }

  // Validação de complemento
  if (!data.semComplemento && (!data.complement || data.complement.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["complement"],
      message: "Preencha o complemento ou marque 'Endereço sem complemento'.",
    })
  }
})

export type AddressSelectionFormData = z.infer<typeof addressSelectionSchema>

export interface GeocodedAddress {
  street: string
  neighborhood: string
  city: string
  state: string
  cep: string
  latitude: number
  longitude: number
  formatted: string
  isValidCity: boolean
}
