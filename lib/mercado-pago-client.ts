export type CardBrand = 'visa' | 'master' | 'amex' | 'elo' | 'hipercard';

export interface TokenizeCardParams {
  cardNumber: string;
  expirationMonth: string | number;
  expirationYear: string | number;
  securityCode: string;
  cardholderName: string;
  docNumber: string;
  docType?: string;
}

export interface TokenizeSavedCardCvvParams {
  cardId: string;
  securityCode: string;
}

export interface TokenizeResult {
  success: boolean;
  token?: string;
  error?: string;
}

export function detectCardBrand(rawNumber: string): CardBrand | null {
  const clean = (rawNumber || '').replace(/\D/g, '');
  if (!clean) return null;
  if (/^(4011|4312|4389|4514|4576|4573|5041|5067|5090|6277|6362|6363|650|651|655)/.test(clean)) return 'elo';
  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[0-1]|2720)/.test(clean)) return 'master';
  if (/^(34|37)/.test(clean)) return 'amex';
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  return null;
}

export function guessPaymentMethodId(
  cardNumber: string
): 'visa' | 'master' | 'amex' | 'elo' | 'hipercard' | 'credit_card' {
  const brand = detectCardBrand(cardNumber);
  return brand || 'credit_card';
}

export function isValidLuhn(raw: string): boolean {
  const clean = (raw || '').replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  let sum = 0;
  let alt = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (alt) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function formatCardNumber(raw: string): string {
  const clean = (raw || '').replace(/\D/g, '').slice(0, 16);
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

export function formatExpiry(raw: string): string {
  const clean = (raw || '').replace(/\D/g, '').slice(0, 4);
  return clean.length > 2 ? `${clean.slice(0, 2)}/${clean.slice(2)}` : clean;
}

export function formatCpf(raw: string): string {
  const clean = (raw || '').replace(/\D/g, '').slice(0, 11);
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
}

export function isValidCpf(raw: string): boolean {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== Number(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === Number(digits[10]);
}

export async function tokenizeCard({
  cardNumber,
  expirationMonth,
  expirationYear,
  securityCode,
  cardholderName,
  docNumber,
  docType = 'CPF',
}: TokenizeCardParams): Promise<TokenizeResult> {
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  if (!publicKey) {
    return { success: false, error: 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ausente' };
  }

  const cleanCardNumber = (cardNumber || '').replace(/\D/g, '');
  const cleanDocNumber = (docNumber || '').replace(/\D/g, '');
  const resolvedDocType = cleanDocNumber.length === 14 ? 'CNPJ' : docType;

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_number: cleanCardNumber,
          expiration_month: Number(expirationMonth),
          expiration_year: Number(expirationYear),
          security_code: securityCode,
          cardholder: {
            name: cardholderName,
            identification: {
              type: resolvedDocType,
              number: cleanDocNumber,
            },
          },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      if (data.luhn_validation === false) {
        return { success: false, error: 'Número do cartão inválido na validação bancária.' };
      }
      return { success: true, token: data.id };
    }

    return {
      success: false,
      error: data.cause?.[0]?.description || data.message || 'Erro ao tokenizar dados do cartão',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão com o Mercado Pago' };
  }
}

export async function tokenizeSavedCardCvv({
  cardId,
  securityCode,
}: TokenizeSavedCardCvvParams): Promise<TokenizeResult> {
  const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
  if (!publicKey) {
    return { success: false, error: 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY ausente' };
  }

  try {
    const response = await fetch(
      `https://api.mercadopago.com/v1/card_tokens?public_key=${encodeURIComponent(publicKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          card_id: cardId,
          security_code: securityCode,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (response.ok && data.id) {
      return { success: true, token: data.id };
    }

    return {
      success: false,
      error: data.cause?.[0]?.description || data.message || 'Erro ao validar CVV do cartão salvo',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão com o Mercado Pago' };
  }
}
