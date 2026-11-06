import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, post, ApiError } from '../lib/api'
import { levels } from '../training/levels'

const fmtAed = (n) => new Intl.NumberFormat('en', { style: 'currency', currency: 'AED' }).format(n)

function DemoBanner() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-coral/70 bg-coral/10 px-4 py-3 text-sm">
      <span className="rounded bg-coral px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">Demo</span>
      <p className="text-cream/90">
        This is a <strong>demo checkout</strong>. No real payment is processed, no money moves and no card details are collected. Demo orders unlock
        premium inside this prototype only.
      </p>
    </div>
  )
}

export default function Upgrade() {
  const { me, refresh } = useAuth()
  const [config, setConfig] = useState(null)
  const [orders, setOrders] = useState([])
  const [order, setOrder] = useState(null) // active checkout
  const [method, setMethod] = useState('demo_card_success')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // 'succeeded' | 'failed' | 'cancelled'

  const loadOrders = () => api('/billing/orders').then(setOrders)
  useEffect(() => {
    api('/billing/config').then(setConfig)
    loadOrders()
  }, [])

  const premium = me.tier === 'premium'

  async function start() {
    setBusy(true)
    setResult(null)
    setOrder(await post('/billing/orders'))
    setBusy(false)
  }

  async function pay() {
    setBusy(true)
    try {
      const o = await post(`/billing/orders/${order.id}/pay`, { method })
      setOrder(o)
      setResult('succeeded')
      await refresh()
    } catch (e) {
      if (e instanceof ApiError && e.data?.status === 'failed') {
        setOrder(e.data)
        setResult('failed')
      } else setResult(e.message)
    }
    await loadOrders()
    setBusy(false)
  }

  async function cancel() {
    setBusy(true)
    await post(`/billing/orders/${order.id}/cancel`)
    setResult('cancelled')
    setOrder(null)
    await loadOrders()
    setBusy(false)
  }

  if (!config) return <div className="min-h-screen pt-24" />
  const premiumLevels = levels.filter((l) => l.tier === 'premium')

  return (
    <section className="grid-bg min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <DemoBanner />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="rounded-[2rem] border border-line bg-ink-2 p-6 sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-violet-soft">SalesQuest Premium</p>
            <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Unlock the full career path</h1>
            <p className="mt-3 text-muted">Levels 1–3 stay free. Premium unlocks Levels 4–15 as they are released.</p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {premiumLevels.map((l) => (
                <li key={l.n} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-violet-soft">L{l.n}</span>
                  <span>{l.title}</span>
                  {l.status === 'planned' ? (
                    <span className="rounded-full border border-dashed border-muted/50 px-1.5 font-mono text-[9px] uppercase text-muted">planned</span>
                  ) : (
                    <span className="rounded-full bg-lime/15 px-1.5 font-mono text-[9px] uppercase text-lime">playable</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[2rem] border border-violet/60 bg-ink p-6 shadow-2xl shadow-violet/20 sm:p-7">
            {premium && !order ? (
              <div className="text-center">
                <p className="text-5xl">💎</p>
                <h2 className="mt-3 font-display text-2xl font-bold">You’re Premium</h2>
                <p className="mt-2 text-sm text-muted">Unlocked via {me.tierSource === 'demo_checkout' ? 'demo checkout (not a real purchase)' : me.tierSource}.</p>
                <Link to="/level/4" className="mt-5 inline-block rounded-xl bg-lime px-5 py-3 font-bold text-ink">Play Level 4 →</Link>
              </div>
            ) : !order ? (
              <>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">Example price</p>
                <p className="mt-1 font-display text-4xl font-extrabold">
                  {fmtAed(config.priceAed)}
                  <span className="text-base font-normal text-muted"> / {config.period}</span>
                </p>
                <p className="mt-1 text-xs text-muted">Illustrative only. Real pricing is still being validated.</p>
                {result === 'cancelled' && <p className="mt-4 rounded-xl bg-ink-3 px-4 py-3 text-sm">Checkout cancelled. Nothing was charged.</p>}
                <button onClick={start} disabled={busy} className="mt-6 w-full rounded-xl bg-violet px-5 py-4 font-display text-lg font-bold hover:brightness-110 disabled:opacity-60">
                  Continue to demo checkout
                </button>
              </>
            ) : result === 'succeeded' ? (
              <div className="animate-pop text-center">
                <p className="text-5xl">✅</p>
                <h2 className="mt-3 font-display text-2xl font-bold">Demo payment successful</h2>
                <p className="mt-2 text-sm text-muted">Premium is now unlocked on your account.</p>
                <dl className="mt-4 space-y-1 rounded-xl bg-ink-2 p-4 text-left font-mono text-xs">
                  <div className="flex justify-between"><dt className="text-muted">Transaction</dt><dd>{order.id}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd>{fmtAed(order.amountAed)} (demo)</dd></div>
                  <div className="flex justify-between"><dt className="text-muted">Method</dt><dd>{order.method}</dd></div>
                </dl>
                <Link to="/level/4" className="mt-5 inline-block rounded-xl bg-lime px-5 py-3 font-bold text-ink">Play Level 4 →</Link>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Demo checkout</h2>
                  <span className="font-mono text-[10px] text-muted">{order.id}</span>
                </div>
                <p className="mt-1 text-sm text-muted">Premium monthly · {fmtAed(order.amountAed)}</p>
                {result === 'failed' && (
                  <p role="alert" className="mt-4 rounded-xl border border-coral/60 bg-coral/10 px-4 py-3 text-sm text-coral">
                    Payment failed: {order.failureReason}. Choose another demo method to retry.
                  </p>
                )}
                <fieldset className="mt-5 space-y-2">
                  <legend className="mb-2 text-sm font-bold">Choose a demo payment method</legend>
                  {config.methods.map((m) => (
                    <label key={m.id} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${method === m.id ? 'border-violet bg-violet/10' : 'border-line'}`}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="accent-violet" />
                        {m.label}
                      </span>
                      <span className={`font-mono text-[10px] uppercase ${m.outcome === 'succeeded' ? 'text-lime' : 'text-coral'}`}>
                        simulates {m.outcome === 'succeeded' ? 'success' : 'decline'}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <button onClick={pay} disabled={busy} className="mt-5 w-full rounded-xl bg-lime px-5 py-4 font-display text-lg font-bold text-ink disabled:opacity-60">
                  {busy ? 'Processing demo payment…' : `Pay ${fmtAed(order.amountAed)} (demo)`}
                </button>
                <button onClick={cancel} disabled={busy} className="mt-2 w-full rounded-xl px-5 py-3 text-sm text-muted hover:text-coral">
                  Cancel checkout
                </button>
              </>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-line bg-ink-2 p-6">
          <h2 className="font-display text-xl font-bold">Demo order history</h2>
          {orders.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="font-mono text-[10px] uppercase tracking-wider text-muted">
                  <tr><th className="py-2">Transaction ID</th><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="py-2.5 font-mono text-xs">{o.id}</td>
                      <td>{new Date(o.createdAt + 'Z').toLocaleString()}</td>
                      <td>{fmtAed(o.amountAed)}</td>
                      <td className="text-muted">{o.method || '—'}</td>
                      <td>
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${o.status === 'succeeded' ? 'bg-lime/15 text-lime' : o.status === 'failed' ? 'bg-coral/15 text-coral' : 'bg-ink-3 text-muted'}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No demo orders yet.</p>
          )}
        </div>
      </div>
    </section>
  )
}
