import test from "node:test"
import assert from "node:assert/strict"
import {
  buildWazeNavigationUrl,
  formatAddressForWaze,
  isPickupDeliveryType,
  isSafeWazeUrl,
} from "../lib/waze.ts"

test("buildWazeNavigationUrl: prioriza coordenadas válidas sobre endereço", () => {
  const url = buildWazeNavigationUrl({
    deliveryType: "delivery",
    address: "Rua das Flores, 120",
    neighborhood: "Centro",
    deliveryLat: -21.8928,
    deliveryLng: -49.0226,
  })
  assert.equal(url, "https://waze.com/ul?ll=-21.8928,-49.0226&navigate=yes")
})

test("buildWazeNavigationUrl: lê coordenadas em metadata quando campos diretos são nulos", () => {
  const url = buildWazeNavigationUrl({
    deliveryType: "delivery",
    address: "Rua das Flores, 120",
    deliveryLat: null,
    deliveryLng: null,
    metadata: { delivery_lat: "-21.8402", delivery_lng: "-49.0058" },
  })
  assert.equal(url, "https://waze.com/ul?ll=-21.8402,-49.0058&navigate=yes")
})

test("buildWazeNavigationUrl: ignora coordenadas inválidas (0,0, NaN, fora do intervalo) e usa fallback de endereço", () => {
  const invalidCases = [
    { deliveryLat: 0, deliveryLng: 0 },
    { deliveryLat: Number.NaN, deliveryLng: -49.02 },
    { deliveryLat: -21.89, deliveryLng: Number.POSITIVE_INFINITY },
    { deliveryLat: 95, deliveryLng: -49.02 },
    { deliveryLat: -91, deliveryLng: -49.02 },
    { deliveryLat: -21.89, deliveryLng: 181 },
    { deliveryLat: -21.89, deliveryLng: -181 },
    { deliveryLat: "", deliveryLng: "" },
  ]

  for (const coords of invalidCases) {
    const url = buildWazeNavigationUrl({
      deliveryType: "delivery",
      address: "Rua das Flores, 120",
      neighborhood: "Centro",
      ...coords,
    })
    assert.ok(url?.startsWith("https://waze.com/ul?q="))
    assert.ok(url?.endsWith("&navigate=yes"))
    assert.equal(
      decodeURIComponent(url.slice("https://waze.com/ul?q=".length, -"&navigate=yes".length)),
      "Rua das Flores, 120, Centro, Iacanga - SP"
    )
  }
})

test("formatAddressForWaze: combina bairro apenas quando ainda não contido (sem acentos / case-insensitive)", () => {
  const withoutNeighborhood = formatAddressForWaze({
    address: "Rua das Flores, 120",
    neighborhood: "Jardim São José",
  })
  assert.equal(withoutNeighborhood, "Rua das Flores, 120, Jardim São José, Iacanga - SP")

  const alreadyHasNeighborhood = formatAddressForWaze({
    address: "Rua das Flores, 120 - jardim sao jose, Iacanga/SP",
    neighborhood: "Jardim São José",
  })
  assert.equal(alreadyHasNeighborhood, "Rua das Flores, 120, jardim sao jose, Iacanga/SP")
})

test("formatAddressForWaze: remove complemento e ruídos de geocodificação preservando rua, número, bairro, CEP e cidade/UF", () => {
  const cleaned = formatAddressForWaze({
    address:
      "Rua das Flores, 120 - Apto 302 - Bloco B (Portão azul, tocar interfone 12) - Centro, 17187-074, Iacanga/SP",
    neighborhood: "Centro",
    complement: "Apto 302",
  })
  assert.equal(cleaned, "Rua das Flores, 120, Centro, 17187-074, Iacanga/SP")

  const cleanedInline = formatAddressForWaze({
    address: "Rua Casa Branca, 45 Casa 2 - Fundos - Portão preto",
    neighborhood: "Vila Nova",
    complement: "Casa 2",
  })
  assert.equal(cleanedInline, "Rua Casa Branca, 45, Vila Nova, Iacanga - SP")

  const otherCityPreserved = formatAddressForWaze({
    address: "Av. Paulista, 1000 - Interfone 40 - Bela Vista, São Paulo/SP",
    neighborhood: "Bela Vista",
  })
  assert.equal(otherCityPreserved, "Av. Paulista, 1000, Bela Vista, São Paulo/SP")

  const noDefaultCity = formatAddressForWaze(
    { address: "Rua das Flores, 120", neighborhood: "Centro" },
    { defaultCity: null, defaultState: null }
  )
  assert.equal(noDefaultCity, "Rua das Flores, 120, Centro")
})

test("buildWazeNavigationUrl: retorna null para pedidos de retirada (pickup / retirada)", () => {
  assert.equal(isPickupDeliveryType("pickup"), true)
  assert.equal(isPickupDeliveryType("RETIRADA"), true)
  assert.equal(
    buildWazeNavigationUrl({
      deliveryType: "pickup",
      address: "Rua das Flores, 120",
      deliveryLat: -21.8928,
      deliveryLng: -49.0226,
    }),
    null
  )
  assert.equal(
    buildWazeNavigationUrl({
      deliveryType: "retirada",
      address: "Rua das Flores, 120",
      deliveryLat: -21.8928,
      deliveryLng: -49.0226,
    }),
    null
  )
})

test("buildWazeNavigationUrl: retorna null para endereços vazios ou genéricos sem coordenadas", () => {
  const emptyCases = [
    "",
    "   ",
    "Endereço não informado",
    "endereco nao informado",
    "Retirada no Balcão da Loja",
    "Apto 302 (fundos)",
    ",,,",
  ]

  for (const address of emptyCases) {
    assert.equal(
      buildWazeNavigationUrl({
        deliveryType: "delivery",
        address,
        deliveryLat: null,
        deliveryLng: null,
      }),
      null
    )
  }
})

test("buildWazeNavigationUrl: neutraliza caracteres especiais e tentativas de injeção de URL", () => {
  assert.equal(
    buildWazeNavigationUrl({
      deliveryType: "delivery",
      address: "javascript:alert(1)",
    }),
    null
  )

  const injected = buildWazeNavigationUrl({
    deliveryType: "delivery",
    address: "Rua São João & Filhos, 88#redirect=https://evil.com?x=1\r\n",
    neighborhood: "Centro",
  })
  assert.ok(injected !== null)
  assert.ok(injected.startsWith("https://waze.com/ul?"))
  const parsed = new URL(injected)
  assert.equal(parsed.origin, "https://waze.com")
  assert.equal(parsed.pathname, "/ul")
  assert.equal(parsed.searchParams.get("navigate"), "yes")
  assert.equal(parsed.searchParams.get("redirect"), null)
  assert.ok(parsed.searchParams.get("q")?.includes("Rua São João & Filhos"))
})

test("buildWazeNavigationUrl: faz fallback para metadata quando deliveryLat/Lng diretos são string vazia ou NaN", () => {
  const fromEmptyStrings = buildWazeNavigationUrl({
    deliveryType: "delivery",
    address: "Rua das Flores, 120",
    deliveryLat: "",
    deliveryLng: "",
    metadata: { delivery_lat: "-21.8402", delivery_lng: "-49.0058" },
  })
  assert.equal(fromEmptyStrings, "https://waze.com/ul?ll=-21.8402,-49.0058&navigate=yes")

  const fromNaN = buildWazeNavigationUrl({
    deliveryType: "delivery",
    address: "Rua das Flores, 120",
    deliveryLat: Number.NaN,
    deliveryLng: Number.NaN,
    metadata: { delivery_lat: -21.8928, delivery_lng: -49.0226 },
  })
  assert.equal(fromNaN, "https://waze.com/ul?ll=-21.8928,-49.0226&navigate=yes")
})

test("formatAddressForWaze e buildWazeNavigationUrl: mesclam opções parciais por chave e suportam cidade sem UF", () => {
  const partialCityOnly = formatAddressForWaze(
    { address: "Rua das Flores, 120", neighborhood: "Centro" },
    { defaultCity: "Bauru" }
  )
  assert.equal(partialCityOnly, "Rua das Flores, 120, Centro, Bauru - SP")

  const cityWithoutState = formatAddressForWaze(
    { address: "Rua das Flores, 120", neighborhood: "Centro" },
    { defaultCity: "Bauru", defaultState: null }
  )
  assert.equal(cityWithoutState, "Rua das Flores, 120, Centro, Bauru")

  const urlPartialCity = buildWazeNavigationUrl(
    { deliveryType: "delivery", address: "Rua das Flores, 120", neighborhood: "Centro" },
    { defaultCity: "Bauru" }
  )
  assert.equal(
    urlPartialCity,
    `https://waze.com/ul?q=${encodeURIComponent("Rua das Flores, 120, Centro, Bauru - SP")}&navigate=yes`
  )

  const urlCityWithoutState = buildWazeNavigationUrl(
    { deliveryType: "delivery", address: "Rua das Flores, 120", neighborhood: "Centro" },
    { defaultCity: "Bauru", defaultState: null }
  )
  assert.equal(
    urlCityWithoutState,
    `https://waze.com/ul?q=${encodeURIComponent("Rua das Flores, 120, Centro, Bauru")}&navigate=yes`
  )
})

test("isSafeWazeUrl: valida URLs seguras e rejeita fragmentos de hash e parâmetros extras", () => {
  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=-21.8928,-49.0226&navigate=yes"), true)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?q=Rua%20das%20Flores%2C%20120&navigate=yes"), true)

  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=-21.8928,-49.0226&navigate=yes#frag"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?q=Rua%201&navigate=yes#redirect=https://evil.com"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=-21.8928,-49.0226&navigate=yes&redirect=https://evil.com"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?q=Rua%201&navigate=yes&extra=1"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=-21.8928,-49.0226&q=Rua%201&navigate=yes"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=0,0&navigate=yes"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?q=%20%20&navigate=yes"), false)
  assert.equal(isSafeWazeUrl("https://waze.com/ul?ll=-21.8928,-49.0226"), false)
})
