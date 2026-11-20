import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCoupon, resolveCouponForCheckout } from '../lib/coupon-rules.ts'

// COMBOTOP: mínimo R$ 60,00, desconto fixo R$ 20,00.
const COMBOTOP = { code: 'COMBOTOP', type: 'fixed', discount: 20, minOrderValue: 60 }
const DELIVERY_FEE = 15 // frete alto: subtotal + frete >= mínimo, mas o frete NÃO conta

test('a) subtotal_itens === valor_minimo: libera e passa na etapa final', () => {
  const ev = evaluateCoupon(COMBOTOP, 60)
  assert.equal(ev.status, 'applied')
  assert.equal(ev.discount, 20)
  assert.equal(ev.missing, 0)

  const final = resolveCouponForCheckout(COMBOTOP, 60)
  assert.equal(final.status, 'applied')
  assert.equal(final.couponCode, 'COMBOTOP')
  assert.equal(final.discount, 20)
})

test('a2) borda sem erro de float: 59.99 + 0.01 libera', () => {
  assert.equal(evaluateCoupon(COMBOTOP, 59.99 + 0.01).status, 'applied')
  assert.equal(evaluateCoupon(COMBOTOP, 59.99).status, 'pending')
})

test('b) subtotal_itens < minimo com frete alto: continua pendente e finaliza sem cupom', () => {
  const itemsSubtotal = 50
  assert.ok(itemsSubtotal + DELIVERY_FEE >= COMBOTOP.minOrderValue, 'pré-condição: com frete passaria do mínimo')

  const ev = evaluateCoupon(COMBOTOP, itemsSubtotal)
  assert.equal(ev.status, 'pending')
  assert.equal(ev.discount, 0)
  assert.equal(ev.missing, 10)
  assert.equal(ev.progress, itemsSubtotal / COMBOTOP.minOrderValue)

  const final = resolveCouponForCheckout(COMBOTOP, itemsSubtotal)
  assert.equal(final.status, 'pending')
  assert.equal(final.couponCode, null, 'cupom pendente não é enviado ao backend')
  assert.equal(final.discount, 0)
  // total do pedido = itens + frete, sem desconto e sem erro
  assert.equal(itemsSubtotal - final.discount + DELIVERY_FEE, 65)
})

test('c) subtotal_itens >= minimo mas subtotal - desconto < minimo: continua liberado', () => {
  const itemsSubtotal = 65
  assert.ok(itemsSubtotal - COMBOTOP.discount < COMBOTOP.minOrderValue, 'pré-condição: 45 < 60')

  const ev = evaluateCoupon(COMBOTOP, itemsSubtotal)
  assert.equal(ev.status, 'applied')
  assert.equal(ev.discount, 20)

  const final = resolveCouponForCheckout(COMBOTOP, itemsSubtotal)
  assert.equal(final.status, 'applied')
  assert.equal(final.couponCode, 'COMBOTOP')
  assert.equal(final.discount, 20)
})

test('transição automática: remover itens volta para pendente; adicionar libera', () => {
  assert.equal(evaluateCoupon(COMBOTOP, 70).status, 'applied')
  assert.equal(evaluateCoupon(COMBOTOP, 40).status, 'pending')
  assert.equal(evaluateCoupon(COMBOTOP, 60).status, 'applied')
})

test('aceita formatos de payload (min_order_value, minOrderVal) e cupom sem mínimo', () => {
  assert.equal(evaluateCoupon({ code: 'X', discount_value: 10, discount_type: 'fixed', min_order_value: 30 }, 29).status, 'pending')
  assert.equal(evaluateCoupon({ code: 'X', discount: 10, type: 'fixed', minOrderVal: 30 }, 30).status, 'applied')
  assert.equal(evaluateCoupon({ code: 'SEMMIN', discount: 5, type: 'fixed' }, 10).discount, 5)
})

test('desconto percentual e limite pelo subtotal; sem cupom => none', () => {
  assert.equal(evaluateCoupon({ code: 'P10', discount: 10, type: 'percentage', minOrderValue: 40 }, 50).discount, 5)
  assert.equal(evaluateCoupon({ code: 'BIG', discount: 100, type: 'fixed' }, 30).discount, 30)
  assert.equal(evaluateCoupon(null, 100).status, 'none')
  assert.equal(resolveCouponForCheckout(null, 100).couponCode, null)
})
