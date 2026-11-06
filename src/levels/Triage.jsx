import { useState } from 'react'
import { useSim } from './useSim'
import { EngineBadge, Panel } from './tools'
import HintsPanel from './HintsPanel'

// Level 4: Lead Command Center. Scores reflect only the evidence the player
// has gathered; they are training heuristics, not win probabilities.
const DIMS = [
  ['productFit', 'Product fit', 25],
  ['need', 'Customer need', 20],
  ['intent', 'Buying intent', 20],
  ['timeline', 'Timeline', 15],
  ['decision', 'Decision process', 10],
  ['engagement', 'Engagement', 10],
]
const STAGES = ['new', 'contacted', 'qualified', 'nurture', 'unqualified']

function Bar({ label, value, color }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[9px] uppercase text-muted">
        <span>{label}</span>
        <span className="text-cream">{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 rounded-full bg-ink-3">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function Triage({ session, setSession, onFinished }) {
  const { busy, error, act, finish } = useSim(session, setSession)
  const [selected, setSelected] = useState(session.leads[0].id)
  const [msg, setMsg] = useState('')
  const [justification, setJustification] = useState(session.justification || '')
  const [reply, setReply] = useState('')
  const lead = session.leads.find((l) => l.id === selected)
  const ranking = session.ranking
  const byId = Object.fromEntries(session.leads.map((l) => [l.id, l]))
  const thread = session.transcript.filter((m) => m.leadId === selected)
  const investigating = session.phase === 'investigate'

  const move = (id, dir) => {
    const r = [...ranking]
    const i = r.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= r.length) return
    ;[r[i], r[j]] = [r[j], r[i]]
    act('rank', { ranking: r })
  }

  async function sendMsg(e) {
    e.preventDefault()
    const t = msg.trim()
    if (!t) return
    setMsg('')
    if (!(await act('message', { leadId: selected, text: t }))) setMsg(t)
  }

  async function done() {
    const v = await finish()
    if (v?.status === 'completed') onFinished(v)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-ink px-4 py-3 text-sm">
        <span className="font-display font-bold">🎯 Lead Command Center</span>
        <span className="rounded-full bg-ink-3 px-3 py-1 font-mono text-xs">📨 {session.contactsLeft} contacts left</span>
        <span className="rounded-full bg-ink-3 px-3 py-1 font-mono text-xs">🔎 {session.researchLeft} research lookups</span>
        <EngineBadge engine={session.engine} />
        <span className="ml-auto text-xs text-muted">Readiness, confidence and priority are training heuristics, not probabilities.</span>
      </div>
      {error && <p role="alert" className="rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_300px]">
        {/* Lead list */}
        <div className="space-y-2">
          {session.leads.map((l) => (
            <button
              key={l.id}
              onClick={() => setSelected(l.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${selected === l.id ? 'border-violet bg-violet/10' : 'border-line bg-ink hover:border-violet-soft'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold">{l.name}</p>
                  <p className="truncate text-[11px] text-muted">{l.source}</p>
                </div>
                <span className="font-mono text-[10px] text-muted">#{ranking.indexOf(l.id) + 1}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Bar label="Ready" value={l.readiness} color="bg-lime" />
                <Bar label="Conf." value={l.confidence} color="bg-sky" />
                <Bar label="Prio" value={l.priority} color="bg-violet" />
              </div>
            </button>
          ))}
        </div>

        {/* Lead detail */}
        <div className="space-y-3">
          <Panel title={`${lead.name} · ${lead.company}`} right={<span className="font-mono text-[10px] text-muted">Value: {lead.valueLabel}</span>}>
            <p className="text-sm text-muted">{lead.profile}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {DIMS.map(([id, label, w]) => {
                const ev = lead.evidence.find((e) => e.dim === id)
                return (
                  <div key={id} className={`rounded-xl border p-2.5 ${ev ? 'border-lime/40 bg-lime/5' : 'border-dashed border-line'}`}>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-muted">{label} · {w}</p>
                    <p className={`mt-1 text-xs ${ev ? 'text-cream' : 'text-muted/60'}`}>{ev ? ev.fact : 'No evidence yet'}</p>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => act('research', { leadId: lead.id })}
                disabled={busy || session.researchLeft <= 0 || lead.evidence.some((e) => e.dim === 'productFit') || !investigating}
                className="rounded-lg border border-sky/60 px-3 py-1.5 text-xs font-bold text-sky disabled:opacity-40"
              >
                🔎 Research company
              </button>
              <label className="flex items-center gap-2 text-xs text-muted">
                CRM stage
                <select value={session.crm[lead.id] || ''} onChange={(e) => act('crm_stage', { leadId: lead.id, stage: e.target.value })} className="rounded-lg border border-line bg-ink-2 px-2 py-1.5 text-cream">
                  <option value="" disabled>—</option>
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </label>
            </div>
          </Panel>

          <Panel title={`Conversation with ${lead.name}`}>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {thread.length === 0 && <p className="text-xs text-muted">No contact yet. Ask about their need, timeline, decision process or fit.</p>}
              {thread.map((m, i) => (
                <div key={i} className={`flex ${m.from === 'player' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.from === 'player' ? 'bg-violet' : m.from === 'tool' ? 'border border-dashed border-sky/50 text-xs text-sky' : 'bg-ink-3'}`}>{m.text}</p>
                </div>
              ))}
            </div>
            {investigating && (
              <form onSubmit={sendMsg} className="mt-3 flex gap-2">
                <input value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={800} disabled={session.contactsLeft <= 0} placeholder={session.contactsLeft > 0 ? `Message ${lead.name}…` : 'No contacts left'} aria-label={`Message ${lead.name}`} className="h-10 flex-1 rounded-lg border border-line bg-ink-2 px-3 text-sm" />
                <button disabled={busy || !msg.trim() || session.contactsLeft <= 0} className="rounded-lg bg-violet px-4 text-sm font-bold disabled:opacity-40">Send</button>
              </form>
            )}
          </Panel>
        </div>

        {/* Ranking & manager */}
        <div className="space-y-3">
          <Panel title="Priority ranking">
            <ol className="space-y-1.5">
              {ranking.map((id, i) => (
                <li key={id} className="flex items-center gap-2 rounded-lg border border-line px-2 py-1.5 text-sm">
                  <span className="w-5 font-mono text-xs text-lime">{i + 1}</span>
                  <span className="flex-1 truncate">{byId[id].name}</span>
                  {investigating && (
                    <>
                      <button onClick={() => move(id, -1)} disabled={busy || i === 0} aria-label={`Move ${byId[id].name} up`} className="px-1 text-muted hover:text-cream disabled:opacity-30">▲</button>
                      <button onClick={() => move(id, 1)} disabled={busy || i === ranking.length - 1} aria-label={`Move ${byId[id].name} down`} className="px-1 text-muted hover:text-cream disabled:opacity-30">▼</button>
                    </>
                  )}
                </li>
              ))}
            </ol>
            {investigating && (
              <>
                <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={4} maxLength={1500} placeholder="Justify your top priorities using the evidence you found…" className="mt-3 w-full rounded-lg border border-line bg-ink-2 p-2 text-sm" />
                <button onClick={() => act('submit', { justification })} disabled={busy || justification.trim().length < 20} className="mt-2 w-full rounded-lg bg-violet px-3 py-2 text-sm font-bold disabled:opacity-40">
                  Submit to sales manager
                </button>
              </>
            )}
          </Panel>

          {session.manager && (
            <Panel title="Sales manager" right={<EngineBadge engine={session.manager.engine} />}>
              <p className="text-sm leading-relaxed">“{session.manager.text}”</p>
              {session.phase === 'challenge' && (
                <>
                  <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={1500} placeholder="Defend or adjust your reasoning…" className="mt-3 w-full rounded-lg border border-line bg-ink-2 p-2 text-sm" />
                  <button onClick={() => act('manager_reply', { text: reply })} disabled={busy || reply.trim().length < 10} className="mt-2 w-full rounded-lg bg-ink-3 px-3 py-2 text-sm font-bold disabled:opacity-40">
                    Reply to manager
                  </button>
                </>
              )}
              {session.phase === 'ready' && (
                <button onClick={done} disabled={busy} className="mt-3 w-full rounded-lg bg-lime px-3 py-2.5 font-bold text-ink disabled:opacity-50">
                  Finish & get coaching
                </button>
              )}
            </Panel>
          )}

          <HintsPanel
            level={4}
            packId={session.pack.id}
            onInsert={(t, target) => {
              if (target === 'justification' && investigating) setJustification(t)
              else if (target === 'reply' && session.phase === 'challenge') setReply(t)
              else if (target === 'message' && investigating) setMsg(t)
            }}
          />
        </div>
      </div>
    </div>
  )
}
