import { useEffect, useRef, useState } from 'react'
import { useSim } from './useSim'
import { Catalogue, CrmPanel, EngineBadge, NextStepBooker, QuoteBuilder, Signals } from './tools'
import HintsPanel from './HintsPanel'
import CoachBar from './CoachBar'

// Level 2: industry-appropriate inbound inbox. The channel decides the look:
// DM-style chat for social/WhatsApp/web chat, email threads for RFQs.
const themes = {
  'Instagram DMs': { header: 'from-[#f58529] via-[#dd2a7b] to-[#8134af]', icon: '📸', style: 'chat' },
  'WhatsApp Business': { header: 'from-[#128C7E] to-[#075E54]', icon: '🟢', style: 'chat' },
  'LinkedIn messages': { header: 'from-[#0a66c2] to-[#004182]', icon: '💼', style: 'chat' },
  'Website demo-request chat': { header: 'from-sky to-violet', icon: '💬', style: 'chat' },
  'Property portal enquiries': { header: 'from-[#2f855a] to-[#22543d]', icon: '🏠', style: 'chat' },
  'Email RFQ inbox': { header: 'from-[#4a5568] to-[#2d3748]', icon: '✉️', style: 'email' },
}

function Message({ m, customer, style }) {
  if (m.from === 'tool')
    return (
      <div className="mx-auto max-w-md rounded-xl border border-dashed border-sky/50 bg-sky/5 px-3 py-2 text-center text-xs text-sky">
        🔒 Only you can see this · {m.text}
      </div>
    )
  const mine = m.from === 'player'
  if (style === 'email')
    return (
      <div className={`rounded-xl border ${mine ? 'border-violet/50 bg-violet/5' : 'border-line bg-ink-2'} p-4`}>
        <div className="flex justify-between text-xs text-muted">
          <span className="font-bold text-cream">{mine ? 'You' : customer.name}</span>
          <span>{new Date(m.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.text}</p>
      </div>
    )
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          m.kind ? 'border border-violet/60 bg-violet/15' : mine ? 'rounded-br-sm bg-violet text-cream' : 'rounded-bl-sm bg-ink-3'
        }`}
      >
        {m.text}
      </div>
    </div>
  )
}

export default function Inbox({ session, setSession, onFinished }) {
  const { busy, error, send, act, finish } = useSim(session, setSession)
  const [text, setText] = useState('')
  const [tab, setTab] = useState('catalogue')
  const endRef = useRef(null)
  const composerRef = useRef(null)
  const theme = themes[session.channel] || themes['WhatsApp Business']
  const c = session.customer
  const typing = busy

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [session.transcript.length, typing])

  async function submit(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    if (!(await send(t))) setText(t)
  }

  async function done() {
    const v = await finish()
    if (v?.status === 'completed') onFinished(v)
  }

  return (
    <>
    <CoachBar coach={session.coach} objectives={session.objectives} rules={session.rules} onUse={(t) => (setText(t), composerRef.current?.focus())} />
    <div className="grid gap-4 lg:grid-cols-[1fr_340px] [&>*]:min-w-0">
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-ink">
        <div className={`flex items-center gap-3 bg-gradient-to-r ${theme.header} px-4 py-3`}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-lg">{theme.icon}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{c.name}</p>
            <p className="truncate text-xs text-white/80">{c.handle} · {session.channel}</p>
          </div>
          <EngineBadge engine={session.engine} />
        </div>
        {theme.style === 'email' && (
          <div className="border-b border-line px-4 py-2 text-xs text-muted">
            Subject: <span className="text-cream">RFQ: pump upgrade</span> · {session.pack.seller}
          </div>
        )}
        <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {session.transcript.map((m, i) => (
            <Message key={i} m={m} customer={c} style={theme.style} />
          ))}
          {typing && <p className="text-xs text-muted">{c.name.split(' ')[0]} is typing…</p>}
          <div ref={endRef} />
        </div>
        {error && <p role="alert" className="border-t border-coral/40 bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>}
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
          <textarea
            ref={composerRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) submit(e)
            }}
            rows={theme.style === 'email' ? 3 : 1}
            maxLength={1200}
            placeholder={theme.style === 'email' ? 'Write your reply…' : 'Message…'}
            aria-label="Your message"
            className="min-h-11 flex-1 resize-none rounded-xl border border-line bg-ink-2 px-3 py-2.5 text-sm focus:border-violet focus:outline-none"
          />
          <button disabled={busy || !text.trim()} className="h-11 rounded-xl bg-violet px-5 font-bold disabled:opacity-40">
            Send
          </button>
        </form>
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 text-xs text-muted">
          <span>{session.turnsLeft} messages left</span>
          <button onClick={done} disabled={busy} className="rounded-lg bg-lime px-4 py-2 font-bold text-ink disabled:opacity-50">
            Finish & get coaching
          </button>
        </div>
      </div>

      <aside className="space-y-3">
        <Signals meters={session.meters} />
        <div className="flex gap-1 rounded-xl border border-line bg-ink p-1 text-xs font-bold">
          {[['catalogue', 'Products'], ['quote', 'Quote'], ['crm', 'CRM'], ['book', 'Book'], ['hints', '💡 Hints']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-lg px-2 py-2 ${tab === id ? 'bg-violet' : 'text-muted hover:text-cream'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'catalogue' && (
          <Catalogue products={session.products} busy={busy} onShare={(id) => act('share_product', { productId: id })} onCheck={(id) => act('check_availability', { productId: id })} />
        )}
        {tab === 'quote' && <QuoteBuilder products={session.products} busy={busy} onQuote={(q) => act('quote', q)} />}
        {tab === 'crm' && <CrmPanel crm={session.crm} busy={busy} terminology={session.pack.terminology} onSave={(crm) => act('crm_update', { crm })} />}
        {tab === 'book' && <NextStepBooker types={session.pack.nextStepTypes} busy={busy} agreed={session.agreedNextStep} onBook={(b) => act('book_next_step', b)} />}
        {tab === 'hints' && (
          <HintsPanel
            level={2}
            packId={session.pack.id}
            customerName={c.name}
            onInsert={(t) => {
              setText(t)
              composerRef.current?.focus()
            }}
          />
        )}
      </aside>
    </div>
    </>
  )
}
