/**
 * Aleatoriedade criptograficamente segura (Web Crypto), funciona no browser e no Node 19+.
 * Use no lugar de Math.random() para protocolos, identificadores e qualquer valor
 * que não deva ser previsível.
 */

function getCrypto(): Crypto {
  const c = (globalThis as { crypto?: Crypto }).crypto
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("Web Crypto indisponível neste ambiente")
  }
  return c
}

/** Inteiro uniforme em [0, maxExclusive), sem viés de módulo (rejection sampling). */
export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0xffffffff) {
    throw new RangeError("maxExclusive deve ser um inteiro entre 1 e 2^32")
  }
  const crypto = getCrypto()
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive
  do {
    crypto.getRandomValues(buf)
  } while (buf[0] >= limit)
  return buf[0] % maxExclusive
}

/** Inteiro uniforme em [min, max] (ambos inclusos). */
export function secureRandomBetween(min: number, max: number): number {
  return min + secureRandomInt(max - min + 1)
}

/** Sufixo aleatório hexadecimal (ex.: para ids temporários). */
export function secureRandomHex(bytes = 8): string {
  const buf = new Uint8Array(bytes)
  getCrypto().getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")
}
