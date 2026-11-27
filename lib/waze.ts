export interface WazeOrderTarget {
  deliveryType?: string | null
  address?: string | null
  neighborhood?: string | null
  complement?: string | null
  deliveryLat?: number | string | null
  deliveryLng?: number | string | null
  metadata?: {
    delivery_lat?: number | string | null
    delivery_lng?: number | string | null
    [key: string]: unknown
  } | null
}

export interface WazeFormatOptions {
  defaultCity?: string | null
  defaultState?: string | null
}

/**
 * Cidade e UF padrão da loja conforme configuração existente em
 * components/MapAddressPicker/AddressFlow.tsx e app/checkout/page.tsx.
 */
export const DEFAULT_STORE_CITY = "Iacanga"
export const DEFAULT_STORE_STATE = "SP"

const WAZE_UL_PREFIX = "https://waze.com/ul?"

const GENERIC_ADDRESS_VALUES = new Set([
  "",
  "-",
  "n/a",
  "na",
  "nao informado",
  "endereco nao informado",
  "sem endereco",
  "retirada",
  "retirada no balcao",
  "retirada no balcao da loja",
  "retirada presencial no balcao",
  "retirada na loja",
  "retirada na loja pelo cliente",
])

const BRAZILIAN_UFS =
  "ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to"

const COMPLEMENT_SEGMENT_PATTERN =
  /^(?:ap(?:to?|artamento)?\.?|bl(?:oco)?\.?|casa|cs\.?|fundos?|portao|interfone|andar|torre|ed(?:ificio)?\.?|kitnet|sobrado|ponto\s+de\s+ref(?:erencia)?|ref(?:erencia)?\.?|obs(?:ervacao|ervacoes)?\.?|prox(?:imo)?\.?|ao\s+lado|em\s+frente|frente\s+a|atras\s+d[eo]|perto\s+d[eo]|campainha|tocar|chamar|deixar|entregar)\b/i

const INLINE_COMPLEMENT_PATTERN =
  /(?:^|[\s,;-]+)(?:ap(?:to?|artamento)\.?|bloco|bl\.?|interfone|port[aã]o|fundos?)\b.*$/i

const INLINE_CASA_AFTER_NUMBER_PATTERN = /(\b\d+[a-zA-Z]?)\s+(?:casa|cs\.?)\b.*$/i

const STREET_PREFIX_PATTERN =
  /^(?:r\.?|rua|av\.?|avenida|trav\.?|travessa|al\.?|alameda|p[cç]a\.?|praca|rod\.?|rodovia|est\.?|estrada|viela|largo|jd\.?|jardim|pq\.?|parque)\b/i

const EXPLICIT_CITY_UF_PATTERN = new RegExp(
  `(?:^|[\\s,/-])[a-z]{3,}(?:\\s+[a-z]{2,})*\\s*[/,-]\\s*(?:${BRAZILIAN_UFS})(?=$|[\\s,;-])`,
  "i"
)

const CONTROL_CHARS_PATTERN = /[\u0000-\u001F\u007F]+/g

function normalizeForCompare(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function isPickupDeliveryType(deliveryType?: string | null): boolean {
  const normalized = normalizeForCompare(String(deliveryType ?? ""))
  return normalized === "pickup" || normalized === "retirada"
}

export function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function extractValidWazeCoordinates(
  target?: WazeOrderTarget | null
): { lat: number; lng: number } | null {
  if (!target || typeof target !== "object") return null
  const lat = parseCoordinate(target.deliveryLat) ?? parseCoordinate(target.metadata?.delivery_lat)
  const lng = parseCoordinate(target.deliveryLng) ?? parseCoordinate(target.metadata?.delivery_lng)

  if (lat === null || lng === null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (lat === 0 && lng === 0) return null

  return { lat, lng }
}

function stripComplementLiteral(address: string, complement?: string | null): string {
  const rawComplement = typeof complement === "string" ? complement.replace(CONTROL_CHARS_PATTERN, " ").trim() : ""
  if (rawComplement.length < 2) return address

  const escaped = escapeRegExp(rawComplement)
  const pattern = new RegExp(`(?:^|[\\s,;\\-–—(]+)${escaped}(?=$|[\\s,;\\-–—)])`, "gi")
  return address.replace(pattern, " ")
}

function cleanAddressSegment(segment: string): string {
  let cleaned = segment.trim()
  if (!cleaned) return ""

  const normalized = normalizeForCompare(cleaned)
  if (COMPLEMENT_SEGMENT_PATTERN.test(normalized)) {
    return ""
  }

  if (!STREET_PREFIX_PATTERN.test(normalized)) {
    cleaned = cleaned.replace(INLINE_COMPLEMENT_PATTERN, "").trim()
  } else {
    const inlineMatch = cleaned.match(INLINE_COMPLEMENT_PATTERN)
    if (inlineMatch && inlineMatch.index !== undefined && inlineMatch.index > 0) {
      cleaned = cleaned.slice(0, inlineMatch.index).trim()
    }
  }

  cleaned = cleaned.replace(INLINE_CASA_AFTER_NUMBER_PATTERN, "$1").trim()
  cleaned = cleaned.replace(/^[,;\s\-–—]+|[,;\s\-–—]+$/g, "").trim()

  if (!cleaned || COMPLEMENT_SEGMENT_PATTERN.test(normalizeForCompare(cleaned))) {
    return ""
  }

  return cleaned
}

function hasCityAndState(address: string, defaultCity?: string | null, defaultState?: string | null): {
  hasCityUf: boolean
  hasDefaultCity: boolean
  hasDefaultState: boolean
} {
  const normalized = normalizeForCompare(address)
  const hasCityUf = EXPLICIT_CITY_UF_PATTERN.test(normalized)

  const normCity = defaultCity ? normalizeForCompare(defaultCity) : ""
  const normState = defaultState ? normalizeForCompare(defaultState) : ""

  const hasDefaultCity = normCity
    ? new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(normCity)}(?=$|[^a-z0-9])`, "i").test(normalized)
    : false

  const hasDefaultState = normState
    ? new RegExp(`(?:^|[\\s,/-])${escapeRegExp(normState)}(?=$|[\\s,;-])`, "i").test(normalized)
    : false

  return { hasCityUf, hasDefaultCity, hasDefaultState }
}

export function formatAddressForWaze(
  target?: Pick<WazeOrderTarget, "address" | "neighborhood" | "complement"> | null,
  options?: WazeFormatOptions
): string | null {
  if (!target || typeof target !== "object") return null

  const rawAddress =
    typeof target.address === "string"
      ? target.address.replace(CONTROL_CHARS_PATTERN, " ").trim()
      : ""

  if (!rawAddress) return null

  const initialNormalized = normalizeForCompare(rawAddress)
  if (GENERIC_ADDRESS_VALUES.has(initialNormalized)) return null
  if (/^(?:javascript|data|vbscript):/i.test(rawAddress.trim())) return null

  // Remove observações entre parênteses (incluindo parênteses não fechados no final)
  let working = rawAddress.replace(/\([^)]*\)/g, " ").replace(/\([^)]*$/g, " ")
  working = stripComplementLiteral(working, target.complement)

  // Divide em segmentos sem quebrar CEPs (17187-074) ou Cidade/UF (Iacanga/SP)
  const rawSegments = working.split(/[,;|\n]+|\s+[-–—]\s+/)
  const cleanedSegments: string[] = []
  const seenSegments = new Set<string>()

  for (const segment of rawSegments) {
    const cleaned = cleanAddressSegment(segment)
    if (!cleaned) continue
    const key = normalizeForCompare(cleaned)
    if (!key || GENERIC_ADDRESS_VALUES.has(key)) continue
    if (seenSegments.has(key)) continue
    seenSegments.add(key)
    cleanedSegments.push(cleaned)
  }

  let formatted = cleanedSegments.join(", ")
  formatted = formatted
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,{2,}/g, ",")
    .replace(/^[,;\s\-–—]+|[,;\s\-–—]+$/g, "")
    .trim()

  const postCleanNormalized = normalizeForCompare(formatted)
  if (!formatted || GENERIC_ADDRESS_VALUES.has(postCleanNormalized)) return null
  if (postCleanNormalized.replace(/[^a-z0-9]/g, "").length < 3) return null

  const rawNeighborhood =
    typeof target.neighborhood === "string"
      ? target.neighborhood.replace(CONTROL_CHARS_PATTERN, " ").trim()
      : ""
  const normNeighborhood = normalizeForCompare(rawNeighborhood)
  if (
    rawNeighborhood &&
    normNeighborhood &&
    !GENERIC_ADDRESS_VALUES.has(normNeighborhood) &&
    !COMPLEMENT_SEGMENT_PATTERN.test(normNeighborhood) &&
    !postCleanNormalized.includes(normNeighborhood)
  ) {
    formatted = `${formatted}, ${rawNeighborhood}`
  }

  const rawDefaultCity =
    options?.defaultCity === undefined ? DEFAULT_STORE_CITY : options.defaultCity
  const rawDefaultState =
    options?.defaultState === undefined ? DEFAULT_STORE_STATE : options.defaultState
  const defaultCity = typeof rawDefaultCity === "string" ? rawDefaultCity.trim() : ""
  const defaultState = typeof rawDefaultState === "string" ? rawDefaultState.trim() : ""
  const locationFlags = hasCityAndState(formatted, defaultCity, defaultState)

  if (!locationFlags.hasCityUf) {
    if (locationFlags.hasDefaultCity && defaultState && !locationFlags.hasDefaultState) {
      formatted = `${formatted} - ${defaultState}`
    } else if (!locationFlags.hasDefaultCity && defaultCity) {
      formatted = defaultState
        ? `${formatted}, ${defaultCity} - ${defaultState}`
        : `${formatted}, ${defaultCity}`
    }
  }

  formatted = formatted
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,{2,}/g, ",")
    .replace(/^[,;\s]+|[,;\s]+$/g, "")
    .trim()

  if (!formatted || GENERIC_ADDRESS_VALUES.has(normalizeForCompare(formatted))) {
    return null
  }

  return formatted
}

const ALLOWED_WAZE_PARAMS = new Set(["navigate", "ll", "q"])

export function isSafeWazeUrl(url: string): boolean {
  if (typeof url !== "string" || !url.startsWith(WAZE_UL_PREFIX)) return false
  try {
    const parsed = new URL(url)
    if (
      parsed.protocol !== "https:" ||
      parsed.hostname !== "waze.com" ||
      parsed.pathname !== "/ul" ||
      parsed.hash !== ""
    ) {
      return false
    }

    if (
      parsed.searchParams.get("navigate") !== "yes" ||
      parsed.searchParams.getAll("navigate").length !== 1
    ) {
      return false
    }

    for (const key of parsed.searchParams.keys()) {
      if (!ALLOWED_WAZE_PARAMS.has(key)) return false
    }

    const llValues = parsed.searchParams.getAll("ll")
    const qValues = parsed.searchParams.getAll("q")
    if (llValues.length > 1 || qValues.length > 1) return false

    const hasLl = llValues.length === 1
    const hasQ = qValues.length === 1
    if (hasLl === hasQ) return false

    if (hasLl) {
      const parts = llValues[0].split(",")
      if (parts.length !== 2) return false
      const lat = parseCoordinate(parts[0])
      const lng = parseCoordinate(parts[1])
      if (lat === null || lng === null) return false
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
      if (lat === 0 && lng === 0) return false
      return true
    }

    return qValues[0].trim().length > 0
  } catch {
    return false
  }
}

function assertSafeWazeUrl(url: string): string | null {
  return isSafeWazeUrl(url) ? url : null
}

export function buildWazeNavigationUrl(
  order?: WazeOrderTarget | null,
  options?: WazeFormatOptions
): string | null {
  if (!order || typeof order !== "object") return null
  if (isPickupDeliveryType(order.deliveryType)) return null

  const coords = extractValidWazeCoordinates(order)
  if (coords) {
    return assertSafeWazeUrl(`${WAZE_UL_PREFIX}ll=${coords.lat},${coords.lng}&navigate=yes`)
  }

  const mergedOptions: WazeFormatOptions = {
    defaultCity: options?.defaultCity === undefined ? DEFAULT_STORE_CITY : options.defaultCity,
    defaultState: options?.defaultState === undefined ? DEFAULT_STORE_STATE : options.defaultState,
  }
  const formattedAddress = formatAddressForWaze(order, mergedOptions)
  if (!formattedAddress) return null

  return assertSafeWazeUrl(
    `${WAZE_UL_PREFIX}q=${encodeURIComponent(formattedAddress)}&navigate=yes`
  )
}
