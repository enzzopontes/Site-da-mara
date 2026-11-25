import test from 'node:test'
import assert from 'node:assert/strict'
import { mapOrderData } from '../lib/order-mapper.ts'
import { isOrderAwaitingPix, isOrderUnderpaidReview } from '../lib/order-status-helpers.ts'

const malformed = {
  id: 'abcdef123456',
  total_amount: null,
  discount_amount: null,
  created_at: 'invalid',
  updated_at: 'invalid',
  order_items: null,
  metadata: { items: null, statusUpdatedAt: 'invalid' },
  status: 'pending',
}

test('mapOrderData: payload malformado nao quebra e normaliza campos', () => {
  const o = mapOrderData(malformed)
  assert.equal(o.total, 0)
  assert.equal(o.discountAmount, 0)
  assert.deepEqual(o.items, [])
  assert.ok(o.createdAt instanceof Date && !Number.isNaN(o.createdAt.getTime()))
  assert.equal(o.completedAt, undefined)
  assert.equal(o.statusUpdatedAt, undefined)
  assert.equal(Number(o.total || 0).toFixed(2), '0.00')
  assert.equal(String(o.id || '').slice(-4).toUpperCase(), '3456')
})

test('mapOrderData: entradas nulas/indefinidas nao lancam', () => {
  for (const input of [null, undefined, {}, { id: null, order_items: 'x', metadata: null }]) {
    const o = mapOrderData(input)
    assert.equal(typeof o.id, 'string')
    assert.equal(o.total, 0)
    assert.ok(Array.isArray(o.items))
  }
})

test('mapOrderData: itens e adicionais malformados', () => {
  const o = mapOrderData({
    id: '1', total_amount: '12.5', created_at: '2026-01-01T00:00:00Z',
    order_items: [{ product_id: 'p', product_name: 'X', quantity: null, product_price: 'abc', adicionais: null }],
  })
  assert.equal(o.total, 12.5)
  assert.equal(o.items[0].quantity, 1)
  assert.equal(o.items[0].price, 0)
  assert.deepEqual(o.items[0].adicionais, [])
})

test('helpers de status aceitam pedido malformado', () => {
  const o = mapOrderData(malformed)
  assert.equal(isOrderUnderpaidReview(o), false)
  assert.equal(isOrderAwaitingPix(o), false)
  assert.equal(isOrderAwaitingPix(null), false)
})
