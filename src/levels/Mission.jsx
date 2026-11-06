import { useEffect, useState } from 'react'
import { api, post, ApiError } from '../lib/api'
import { formatMoney } from '../training/levels'
import { Panel } from './tools'

// Guided missions (Levels 5-15): a level-specific scene plus a short sequence
// of steps. Every answer is checked on the server; wrong answers get a hint
// and can be retried as often as needed.

function Scene({ scene }) {
  const box = 'rounded-xl border border-line bg-ink-2 p-3'
  return (
    <Panel title={scene.title}>
      {scene.note && <p className="mb-3 rounded-xl border-l-4 border-coral bg-coral/10 px-3 py-2 text-sm">{scene.note}</p>}
      {scene.type === 'products' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {scene.items.map((p) => (
            <div key={p.name} className={box}>
              <div className="flex justify-between gap-2"><p className="text-sm font-bold">{p.name}</p><p className="font-mono text-xs text-lime">{p.price}</p></div>
              <p className="mt-1 text-[11px] text-muted">{p.specs.join(' · ')}</p>
            </div>
          ))}
        </div>
      )}
      {scene.type === 'timeline' && (
        <ol className="relative space-y-3 border-l border-line pl-4">
          {scene.items.map((i) => (
            <li key={i.day}><span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full bg-violet" /><p className="font-mono text-[10px] uppercase text-violet-soft">{i.day} · {i.who}</p><p className="text-sm">{i.text}</p></li>
          ))}
        </ol>
      )}
      {scene.type === 'network' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {scene.items.map((p, i) => (
            <div key={p.name} className={`${box} flex items-center gap-3`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-ink ${i === 0 ? 'bg-lime' : i === 3 ? 'bg-sky' : 'bg-muted/60'}`}>{p.name[0]}</span>
              <div><p className="text-sm font-bold">{p.name}</p><p className="text-[11px] text-muted">{p.status}</p></div>
            </div>
          ))}
        </div>
      )}
      {scene.type === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="py-1">Order</th><th>Item</th><th>Status</th><th>Total</th></tr></thead>
            <tbody className="divide-y divide-line">{scene.items.map((o) => <tr key={o.id}><td className="py-2 font-mono text-xs">{o.id.toUpperCase()}</td><td>{o.item}</td><td className={/late|damaged/i.test(o.status) ? 'text-coral' : 'text-muted'}>{o.status}</td><td>{o.total}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {scene.type === 'booths' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {scene.items.map((v) => <div key={v.id} className={box}><p className="text-sm font-bold">🪪 {v.name}</p><p className="mt-1 text-xs text-muted">{v.line}</p></div>)}
        </div>
      )}
      {scene.type === 'deal' && (
        <dl className="grid grid-cols-2 gap-2">
          {scene.items.map((i) => <div key={i.k} className={box}><dt className="font-mono text-[10px] uppercase text-muted">{i.k}</dt><dd className="font-display font-bold">{i.v}</dd></div>)}
        </dl>
      )}
      {scene.type === 'meeting' && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {scene.items.map((p) => (
            <div key={p.name} className="grid aspect-video place-items-center rounded-xl bg-gradient-to-br from-ink-3 to-ink-2 p-2 text-center">
              <div><span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-violet font-bold">{p.name[0]}</span><p className="mt-1 text-xs font-bold">{p.name}</p><p className="text-[10px] text-muted">{p.role}</p></div>
            </div>
          ))}
        </div>
      )}
      {scene.type === 'document' && (
        <div className="rounded-xl bg-cream p-4 font-mono text-xs leading-relaxed text-ink">
          <p className="mb-2 font-bold">RFQ #2041</p>
          {scene.lines.map((l) => <p key={l} className={/not specified/.test(l) ? 'bg-coral/30' : ''}>• {l}</p>)}
        </div>
      )}
      {scene.type === 'pipeline' && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="py-1">Deal</th><th>Stage</th><th>Value</th><th>Last contact</th><th>Next step</th></tr></thead>
            <tbody className="divide-y divide-line">{scene.items.map((d) => <tr key={d.id}><td className="py-2 font-bold">{d.name}</td><td>{d.stage}</td><td>{d.value}</td><td>{d.last}</td><td className={d.next === '—' ? 'text-coral' : ''}>{d.next}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {scene.type === 'day' && (
        <ul className="space-y-1.5">
          {scene.items.map((t) => <li key={t.id} className={`${box} flex items-center justify-between gap-2 py-2 text-sm`}><span>{t.label}</span><span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${t.tag === 'Urgent' || t.tag === 'Hot' ? 'bg-coral/20 text-coral' : 'bg-ink-3 text-muted'}`}>{t.tag}</span></li>)}
        </ul>
      )}
    </Panel>
  )
}

function StepInput({ step, value, onChange, region, result }) {
  const opt = (selected) => `w-full rounded-xl border px-4 py-3 text-left text-sm transition ${selected ? 'border-violet bg-violet/15' : 'border-line hover:border-violet-soft'}`
  if (step.type === 'choose') {
    const picks = value || []
    const want = step.pick || 1
    const toggle = (id) => onChange(want === 1 ? [id] : picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id].slice(-want))
    return (
      <div className="space-y-2">
        {want > 1 && <p className="text-xs text-muted">Pick {want}.</p>}
        {step.options.map((o) => (
          <button key={o.id} type="button" onClick={() => toggle(o.id)} aria-pressed={picks.includes(o.id)} className={opt(picks.includes(o.id))}>
            <span className="font-bold">{o.label}</span>
            {o.detail && <span className="mt-0.5 block text-xs text-muted">{o.detail}</span>}
          </button>
        ))}
      </div>
    )
  }
  if (step.type === 'rank') {
    const order = value || step.items.map((i) => i.id)
    const move = (i, d) => {
      const r = [...order]
      ;[r[i], r[i + d]] = [r[i + d], r[i]]
      onChange(r)
    }
    return (
      <ol className="space-y-2">
        {order.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm">
            <span className="w-5 font-mono text-xs text-lime">{i + 1}</span>
            <span className="flex-1">{step.items.find((x) => x.id === id).label}</span>
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="rounded px-2 py-1 hover:bg-ink-3 disabled:opacity-30">▲</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label="Move down" className="rounded px-2 py-1 hover:bg-ink-3 disabled:opacity-30">▼</button>
          </li>
        ))}
      </ol>
    )
  }
  if (step.type === 'match') {
    const v = value || {}
    return (
      <div className="space-y-2">
        {step.left.map((l) => (
          <div key={l.id} className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center ${result?.rows ? (result.rows[l.id] ? 'border-lime/60' : 'border-coral/60') : 'border-line'}`}>
            <span className="flex-1 text-sm">{l.label}</span>
            <select value={v[l.id] || ''} onChange={(e) => onChange({ ...v, [l.id]: e.target.value })} className="rounded-lg border border-line bg-ink-2 px-3 py-2 text-sm" aria-label={l.label}>
              <option value="">Choose…</option>
              {step.choices.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        ))}
      </div>
    )
  }
  if (step.type === 'write') {
    return (
      <div>
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={4} maxLength={1200} placeholder={step.placeholder} className="w-full rounded-xl border border-line bg-ink-2 p-3 text-sm focus:border-violet focus:outline-none" aria-label="Your answer" />
        <p className="mt-2 text-xs text-muted">Include at least {step.need}:</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {step.checklist.map((c) => (
            <li key={c} className={`rounded-full px-2.5 py-1 text-[11px] ${result?.found?.includes(c) ? 'bg-lime/15 text-lime' : 'bg-ink-3 text-muted'}`}>{result?.found?.includes(c) ? '✓ ' : ''}{c}</li>
          ))}
        </ul>
      </div>
    )
  }
  if (step.type === 'calc') {
    const d = value?.discount ?? 0
    const total = Math.round(step.unitPrice * step.quantity * (1 - d / 100))
    const over = step.budget && total > step.budget
    return (
      <div className="space-y-3 rounded-xl border border-line p-4">
        <p className="text-sm">{step.quantity} × {step.productName} @ {formatMoney(step.unitPrice, region)}</p>
        <label className="block text-sm">
          Discount: <strong className={d > step.maxDiscount ? 'text-coral' : 'text-lime'}>{d}%</strong> (limit {step.maxDiscount}%)
          <input type="range" min="0" max={Math.max(20, step.maxDiscount + 5)} step="0.5" value={d} onChange={(e) => onChange({ discount: Number(e.target.value) })} className="mt-2 w-full accent-violet" />
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-ink-2 p-2"><p className="font-mono text-[10px] uppercase text-muted">Offer total</p><p className={`font-display text-lg font-bold ${over ? 'text-coral' : 'text-cream'}`}>{formatMoney(total, region)}</p></div>
          {step.budget && <div className="rounded-lg bg-ink-2 p-2"><p className="font-mono text-[10px] uppercase text-muted">Customer budget</p><p className="font-display text-lg font-bold">{formatMoney(step.budget, region)}</p></div>}
        </div>
      </div>
    )
  }
  return null
}

export default function Mission({ level, industry, onFinished }) {
  const [m, setM] = useState(null)
  const [error, setError] = useState('')
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState({})
  const [results, setResults] = useState({})
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const q = industry ? `?industry=${industry}` : ''

  useEffect(() => {
    api(`/missions/${level}${q}`).then(setM).catch((e) => setError(e.message))
  }, [level, q])

  if (error) return <p className="rounded-xl bg-coral/10 p-4 text-coral">{error}</p>
  if (!m) return <p className="text-muted">Loading mission…</p>

  const step = m.steps[i]
  const result = results[step.id]
  const passed = result?.correct

  async function check() {
    setBusy(true)
    try {
      const r = await post(`/missions/${level}/check`, { stepId: step.id, answer: answers[step.id], ...(industry ? { industry } : {}) })
      setResults((x) => ({ ...x, [step.id]: r }))
      if (!r.correct) setShowHint(true)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  async function next() {
    setShowHint(false)
    if (i < m.steps.length - 1) return setI(i + 1)
    setBusy(true)
    const r = await post(`/missions/${level}/complete`, { answers, hintsUsed, ...(industry ? { industry } : {}) })
    onFinished(r)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
      <div className="space-y-4">
        <div className="rounded-2xl border border-line bg-ink p-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-lime">Level {level} · {m.title}</p>
          <ul className="mt-2 space-y-1 text-sm text-cream/85">
            {m.rules.map((r) => <li key={r}>📌 {r}</li>)}
          </ul>
        </div>
        <Scene scene={m.scene} />
      </div>

      <div className="space-y-3">
        <div className="flex gap-1.5" aria-label={`Step ${i + 1} of ${m.steps.length}`}>
          {m.steps.map((s, k) => <span key={s.id} className={`h-1.5 flex-1 rounded-full ${results[s.id]?.correct ? 'bg-lime' : k === i ? 'bg-violet' : 'bg-ink-3'}`} />)}
        </div>
        <div key={step.id} className="animate-fade-up rounded-2xl border border-line bg-ink p-5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">Step {i + 1} of {m.steps.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold leading-snug">{step.prompt}</h2>
          <div className="mt-4">
            <StepInput step={step} value={answers[step.id]} region={m.region} result={result} onChange={(v) => setAnswers((a) => ({ ...a, [step.id]: v }))} />
          </div>

          {result && (
            <p role="status" className={`mt-4 rounded-xl px-3 py-2 text-sm ${passed ? 'bg-lime/10 text-lime' : 'bg-coral/10 text-coral'}`}>
              {passed ? '✓ ' : '✗ '}{result.feedback}
            </p>
          )}
          {showHint && !passed && <p className="mt-2 rounded-xl border border-dashed border-sky/60 bg-sky/5 px-3 py-2 text-sm text-sky">💡 {step.hint}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            {!passed ? (
              <>
                <button onClick={check} disabled={busy || answers[step.id] == null} className="rounded-xl bg-violet px-5 py-2.5 font-bold disabled:opacity-40">
                  {result ? 'Try again' : 'Check answer'}
                </button>
                {!showHint && (
                  <button onClick={() => (setShowHint(true), setHintsUsed((h) => h + 1))} className="rounded-xl border border-line px-4 py-2.5 text-sm hover:border-sky">
                    💡 Hint (−2 pts)
                  </button>
                )}
                {result && (
                  <button onClick={next} disabled={busy} className="rounded-xl px-4 py-2.5 text-sm text-muted hover:text-cream">
                    Skip →
                  </button>
                )}
              </>
            ) : (
              <button onClick={next} disabled={busy} className="rounded-xl bg-lime px-5 py-2.5 font-bold text-ink disabled:opacity-50">
                {i < m.steps.length - 1 ? 'Next step →' : busy ? 'Saving…' : 'Finish & see report'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
