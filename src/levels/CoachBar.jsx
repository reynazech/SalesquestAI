import { useState } from 'react'

// Always-visible coach: the next best move, an optional example, the
// mission objectives and the rules.
export default function CoachBar({ coach, objectives = [], rules = [], onUse }) {
  const [showRules, setShowRules] = useState(false)
  const done = objectives.filter((o) => o.done).length
  return (
    <div className="mb-4 space-y-3 rounded-2xl border border-lime/40 bg-lime/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-lg text-ink" aria-hidden>🧭</span>
        <div className="flex-1">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-lime">Coach · next move</p>
          <p className="mt-0.5 text-sm text-cream">{coach?.text}</p>
          {coach?.example && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="rounded-lg bg-ink-2 px-3 py-1.5 text-xs text-cream/80">“{coach.example}”</p>
              {onUse && (
                <button onClick={() => onUse(coach.example)} className="rounded-lg bg-lime px-3 py-1.5 text-xs font-bold text-ink">
                  Use this
                </button>
              )}
            </div>
          )}
        </div>
        <button onClick={() => setShowRules((v) => !v)} className="self-start rounded-lg border border-line px-3 py-1.5 text-xs font-bold hover:border-lime">
          {showRules ? 'Hide rules' : '📌 Rules'}
        </button>
      </div>
      {showRules && (
        <ul className="space-y-1 rounded-xl bg-ink-2 p-3 text-sm text-cream/85">
          {rules.map((r) => <li key={r}>📌 {r}</li>)}
        </ul>
      )}
      {objectives.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">Objectives · {done}/{objectives.length}</p>
          <ul className="flex flex-wrap gap-1.5">
            {objectives.map((o) => (
              <li key={o.id} className={`rounded-full px-2.5 py-1 text-[11px] ${o.done ? 'bg-lime/20 text-lime' : 'bg-ink-3 text-muted'}`}>
                {o.done ? '✓' : '○'} {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
