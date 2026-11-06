import express from 'express'
import { randomBytes } from 'node:crypto'
import { requireAuth } from './auth.js'

// DEMO checkout. No payment provider is called and no card data is accepted:
// the client picks one of the fixed demo methods below and the server decides
// the outcome from that choice. Successful demo orders grant a premium
// entitlement with source 'demo_checkout' so it is distinguishable from any
// future real billing.

export const DEMO_METHODS = {
  demo_card_success: { label: 'Demo Visa •••• 4242', outcome: 'succeeded' },
  demo_card_decline: { label: 'Demo card •••• 0002', outcome: 'failed', reason: 'Demo card declined (insufficient funds simulation)' },
  demo_wallet: { label: 'Demo wallet', outcome: 'succeeded' },
}

const newTxnId = () => `DEMO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(4).toString('hex').toUpperCase()}`

export function createBillingRouter({ db, priceAed }) {
  const r = express.Router()
  const amountMinor = Math.round(priceAed * 100)
  const getOrder = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
  const dto = (o) => ({
    id: o.id,
    amountAed: o.amount_minor / 100,
    currency: o.currency,
    status: o.status,
    method: o.method ? DEMO_METHODS[o.method]?.label || o.method : null,
    failureReason: o.failure_reason,
    demo: !!o.demo,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  })

  r.get('/config', (_req, res) =>
    res.json({ demo: true, priceAed, currency: 'AED', period: 'month', methods: Object.entries(DEMO_METHODS).map(([id, m]) => ({ id, label: m.label, outcome: m.outcome })) }),
  )

  r.use(requireAuth)

  r.get('/orders', (req, res) => {
    res.json(db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 50').all(req.user.id).map(dto))
  })

  // Step 1: create a pending demo order with a unique transaction id.
  r.post('/orders', (req, res) => {
    const id = newTxnId()
    db.prepare(`INSERT INTO orders (id, user_id, amount_minor, currency, status, demo) VALUES (?, ?, ?, 'AED', 'pending', 1)`).run(id, req.user.id, amountMinor)
    res.status(201).json(dto(getOrder.get(id, req.user.id)))
  })

  // Step 2: "pay" with a demo method. Failed orders can be retried.
  r.post('/orders/:id/pay', (req, res) => {
    const o = getOrder.get(req.params.id, req.user.id)
    if (!o) return res.status(404).json({ error: 'Order not found' })
    if (!['pending', 'failed'].includes(o.status)) return res.status(409).json({ error: `Order is already ${o.status}` })
    const method = DEMO_METHODS[req.body?.method]
    if (!method) return res.status(400).json({ error: 'Choose a demo payment method' })
    db.prepare(`UPDATE orders SET status = ?, method = ?, failure_reason = ?, updated_at = datetime('now') WHERE id = ?`).run(
      method.outcome,
      req.body.method,
      method.reason || null,
      o.id,
    )
    if (method.outcome === 'succeeded') {
      db.prepare(`INSERT INTO entitlements (user_id, tier, source) VALUES (?, 'premium', 'demo_checkout')`).run(req.user.id)
    }
    const updated = dto(getOrder.get(o.id, req.user.id))
    res.status(method.outcome === 'succeeded' ? 200 : 402).json(updated)
  })

  r.post('/orders/:id/cancel', (req, res) => {
    const o = getOrder.get(req.params.id, req.user.id)
    if (!o) return res.status(404).json({ error: 'Order not found' })
    if (!['pending', 'failed'].includes(o.status)) return res.status(409).json({ error: `Order is already ${o.status}` })
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).run(o.id)
    res.json(dto(getOrder.get(o.id, req.user.id)))
  })

  return r
}
