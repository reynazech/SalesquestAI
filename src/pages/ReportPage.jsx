import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { missionCopy } from '../training/levels'
import { barColor, scoreColor } from '../lib/rubric'
import { Spinner } from '../App'

export default function ReportPage() {
  const { id } = useParams()
  const [s, setS] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    api(`/sim/${id}`)
      .then((v) => {
        setS(v)
        return api(`/sim/history?level=${v.level}`)
      })
      .then(setHistory)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="px-4 pt-28 text-center text-coral">{error}</p>
  if (!s) return <Spinner />
  if (!s.report) return <p className="px-4 pt-28 text-center text-muted">This mission hasn’t been finished yet.</p>

  const r = s.report
  const m = missionCopy(s.level, s.pack.id)
  const ordered = [...history].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const idx = ordered.findIndex((h) => h.id === s.id)
  const prev = idx > 0 ? ordered[idx - 1] : null
  const prevDim = (dimId) => prev?.dims?.find((d) => d.id === dimId)?.score

  return (
    <section className="grid-bg min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to="/dashboard" className="text-sm text-muted hover:text-lime">← Dashboard</Link>
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-line px-4 py-3 font-mono text-xs text-muted">
          ℹ️ Scores come from fixed, rule-based checks of your actual messages and tool actions.
          {r.coachNote ? ' The written debrief is AI-generated from the same transcript.' : ' AI debrief is off (no AI key configured).'}
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="rounded-3xl border border-violet/60 bg-gradient-to-br from-violet/30 to-ink p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-violet-soft">Level {s.level} · {m.title}</p>
            <p className="mt-3 font-display text-8xl font-extrabold leading-none text-lime">{r.score}</p>
            <p className="font-mono text-sm text-muted">/ 100</p>
            {prev && (
              <p className={`mt-2 font-mono text-sm ${r.score >= prev.score ? 'text-lime' : 'text-coral'}`}>
                {r.score >= prev.score ? '▲' : '▼'} {Math.abs(r.score - prev.score)} vs previous attempt ({prev.score})
              </p>
            )}
            <p className="mt-4 rounded-xl bg-ink px-3 py-2 text-sm font-bold">{r.outcome}</p>
            <p className="mt-1 text-[11px] text-muted">Simulated outcome</p>
          </div>
          <div className="space-y-4">
            {r.coachNote && (
              <div className="rounded-3xl border border-line bg-ink-2 p-6">
                <h2 className="font-display text-xl font-bold">Coach’s debrief</h2>
                <p className="mt-2 leading-relaxed text-cream/90">{r.coachNote}</p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-line bg-ink-2 p-5">
                <h3 className="font-display font-bold text-lime">Strengths</h3>
                <ul className="mt-2 space-y-1 text-sm">{r.strengths.length ? r.strengths.map((t) => <li key={t}>✓ {t}</li>) : <li className="text-muted">Keep practising, strengths will show here.</li>}</ul>
              </div>
              <div className="rounded-3xl border border-line bg-ink-2 p-5">
                <h3 className="font-display font-bold text-coral">Focus next</h3>
                <ul className="mt-2 space-y-1 text-sm">{r.improvements.length ? r.improvements.map((t) => <li key={t}>↗ {t}</li>) : <li className="text-muted">No major gaps. Try a harder level.</li>}</ul>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-ink-2 p-6">
          <h2 className="font-display text-xl font-bold">Skill breakdown with evidence</h2>
          <div className="mt-4 space-y-5">
            {r.dims.map((d) => {
              const p = prevDim(d.id)
              return (
                <div key={d.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-bold">{d.label}</span>
                    <span className="font-mono">
                      <span className={scoreColor(d.score)}>{d.score}</span>
                      {p != null && <span className={`ml-2 text-[11px] ${d.score >= p ? 'text-lime' : 'text-coral'}`}>{d.score >= p ? '+' : ''}{d.score - p}</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-ink-3">
                    <div className={`h-full rounded-full ${barColor(d.score)}`} style={{ width: `${d.score}%` }} />
                  </div>
                  <ul className="mt-2 space-y-1">
                    {d.evidence.map((e, i) => (
                      <li key={i} className={`text-xs leading-relaxed ${e.kind === 'good' ? 'text-cream/80' : 'text-coral/90'}`}>
                        {e.kind === 'good' ? '✓' : '✗'} {e.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>

        {r.leadTable && (
          <div className="overflow-x-auto rounded-3xl border border-line bg-ink-2 p-6">
            <h2 className="font-display text-xl font-bold">Your final lead board</h2>
            <table className="mt-3 w-full min-w-[480px] text-left text-sm">
              <thead className="font-mono text-[10px] uppercase text-muted"><tr><th className="py-2">Your rank</th><th>Lead</th><th>Readiness</th><th>Evidence confidence</th><th>Priority</th></tr></thead>
              <tbody className="divide-y divide-line">
                {[...r.leadTable].sort((a, b) => a.rank - b.rank).map((l) => (
                  <tr key={l.id}><td className="py-2 font-mono">#{l.rank}</td><td>{l.name}</td><td>{l.readiness}</td><td>{l.confidence}%</td><td>{l.priority}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ordered.length > 1 && (
          <div className="rounded-3xl border border-line bg-ink-2 p-6">
            <h2 className="font-display text-xl font-bold">All attempts at this level</h2>
            <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
              {ordered.map((h, i) => (
                <Link key={h.id} to={`/report/${h.id}`} className="flex flex-1 flex-col items-center gap-1" title={`Attempt ${i + 1}: ${h.score}`}>
                  <span className="font-mono text-[10px] text-muted">{h.score}</span>
                  <span className={`w-full max-w-10 rounded-t ${h.id === s.id ? 'bg-lime' : 'bg-violet/60'}`} style={{ height: `${Math.max(4, h.score)}px` }} />
                  <span className="font-mono text-[10px] text-muted">#{i + 1}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-line bg-ink-2 p-6">
          <button onClick={() => setShowTranscript((v) => !v)} className="font-display text-xl font-bold">
            {showTranscript ? '▾' : '▸'} Replay transcript ({s.transcript.length} events)
          </button>
          {showTranscript && (
            <ol className="mt-4 space-y-2 text-sm">
              {s.transcript.map((t, i) => (
                <li key={i} className={t.from === 'player' ? 'text-cream' : t.from === 'tool' ? 'text-sky' : 'text-muted'}>
                  <span className="mr-2 font-mono text-[10px] uppercase">{t.from === 'player' ? 'You' : t.from === 'customer' ? t.leadName || 'Customer' : t.from}</span>
                  {t.text}
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link to={`/level/${s.level}`} className="rounded-2xl bg-lime px-7 py-4 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_#8fae1c]">↺ Retry Level {s.level}</Link>
          <Link to="/dashboard" className="rounded-2xl border border-line px-7 py-4 font-display text-lg font-bold hover:border-violet">Back to dashboard</Link>
        </div>
      </div>
    </section>
  )
}
