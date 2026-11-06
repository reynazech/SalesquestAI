import { useEffect, useRef, useState } from 'react'
import { useSim } from './useSim'
import { CrmPanel, EngineBadge, NextStepBooker, Panel, Signals } from './tools'
import { listen, localeFor, requestMicrophone, speak, stopSpeaking, voiceSupport } from '../voice/browserSpeech'

const MIC_ERRORS = {
  'not-allowed': 'Microphone access was blocked. Allow it in your browser’s site settings, or type below.',
  denied: 'Microphone access was blocked. Allow it in your browser’s site settings, or type below.',
  'no-speech': 'I didn’t catch anything. Hold the button and speak, or type instead.',
  'audio-capture': 'No microphone was found. Plug one in, or type instead.',
  unavailable: 'No microphone is available on this device. Use the text box instead.',
  network: 'Speech recognition needs an internet connection. Type instead for now.',
}

function useCallTimer() {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}

// Level 3: live call with push-to-talk, spoken replies, captions and a text fallback.
export default function CallConsole({ session, setSession, onFinished }) {
  const { busy, error, send, act, finish } = useSim(session, setSession)
  const support = voiceSupport()
  const canVoice = support.recognition && support.microphone
  const lang = localeFor(session.region)
  const [mic, setMic] = useState('unknown') // unknown | granted | denied | unavailable
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(support.synthesis)
  const [text, setText] = useState('')
  const [notes, setNotes] = useState(session.notes || '')
  const [tab, setTab] = useState('notes')
  const ctrl = useRef(null)
  const held = useRef(false)
  const lastSpoken = useRef(session.transcript.length)
  const captionsEnd = useRef(null)
  const timer = useCallTimer()
  const c = session.customer

  // Speak each new customer line; clean up audio and recognition on unmount.
  useEffect(() => {
    const fresh = session.transcript.slice(lastSpoken.current).filter((m) => m.from === 'customer')
    lastSpoken.current = session.transcript.length
    if (voiceOn && fresh.length) speak(fresh.map((m) => m.text).join(' '), { lang, onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
    captionsEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [session.transcript, voiceOn, lang])
  useEffect(() => () => {
    ctrl.current?.abort()
    stopSpeaking()
  }, [])

  async function startTalking() {
    if (recording || busy) return
    held.current = true
    setVoiceError('')
    stopSpeaking()
    if (mic !== 'granted') {
      const state = await requestMicrophone()
      setMic(state)
      if (state !== 'granted') return setVoiceError(MIC_ERRORS[state])
      // The permission prompt interrupts the press; start on the next one.
      if (!held.current) return setVoiceError('Microphone ready. Hold the button and speak.')
    }
    setInterim('')
    setRecording(true)
    ctrl.current = listen({
      lang,
      onInterim: setInterim,
      onFinal: async (t) => {
        setInterim('')
        await send(t, true)
      },
      onError: (code) => {
        if (code === 'not-allowed') setMic('denied')
        setVoiceError(MIC_ERRORS[code] || `Voice error (${code}). You can type instead.`)
      },
      onEnd: () => setRecording(false),
    })
  }
  const stopTalking = () => {
    held.current = false
    ctrl.current?.stop()
  }

  async function submitText(e) {
    e.preventDefault()
    const t = text.trim()
    if (!t) return
    setText('')
    if (!(await send(t))) setText(t)
  }

  async function endCall() {
    ctrl.current?.abort()
    stopSpeaking()
    if (notes !== session.notes) await act('note', { text: notes })
    const v = await finish()
    if (v?.status === 'completed') onFinished(v)
  }

  const captions = session.transcript.filter((m) => m.from !== 'system')
  const brief = session.transcript.find((m) => m.from === 'system')

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-ink-2 to-ink">
        {/* Call header */}
        <div className="flex items-center gap-4 border-b border-line px-5 py-4">
          <div className="relative">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-coral to-violet font-display text-xl font-bold">{c.name[0]}</div>
            {speaking && <span className="absolute inset-0 animate-ping rounded-full border-2 border-lime" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-bold">{c.name}</p>
            <p className="truncate text-xs text-muted">{c.role} · {session.channel}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg text-lime">● {timer}</p>
            <EngineBadge engine={session.engine} />
          </div>
        </div>

        {brief && <p className="border-b border-line bg-ink-3/50 px-5 py-2 text-xs text-muted">📋 {brief.text}</p>}

        {/* Captions */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite" aria-label="Call captions">
          {captions.length === 0 && <p className="text-center text-sm text-muted">The line is open. Introduce yourself.</p>}
          {captions.map((m, i) => (
            <p key={i} className={m.from === 'tool' ? 'text-center text-xs text-sky' : 'text-sm leading-relaxed'}>
              {m.from !== 'tool' && (
                <span className={`mr-2 font-mono text-[10px] font-bold uppercase ${m.from === 'player' ? 'text-violet-soft' : 'text-coral'}`}>
                  {m.from === 'player' ? `You${m.voice ? ' 🎙' : ''}` : c.name.split(' ')[0]}
                </span>
              )}
              {m.text}
            </p>
          ))}
          {interim && <p className="text-sm italic text-muted"><span className="mr-2 font-mono text-[10px] font-bold uppercase text-violet-soft">You</span>{interim}…</p>}
          {busy && !interim && <p className="text-xs text-muted">{c.name.split(' ')[0]} is thinking…</p>}
          <div ref={captionsEnd} />
        </div>

        {(voiceError || error) && <p role="alert" className="border-t border-coral/40 bg-coral/10 px-5 py-2 text-sm text-coral">{voiceError || error}</p>}

        {/* Controls */}
        <div className="space-y-3 border-t border-line p-4">
          {canVoice && mic !== 'denied' && mic !== 'unavailable' ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onPointerDown={(e) => {
                  e.preventDefault()
                  startTalking()
                }}
                onPointerUp={stopTalking}
                onPointerLeave={() => recording && stopTalking()}
                onKeyDown={(e) => {
                  if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) startTalking()
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') stopTalking()
                }}
                disabled={busy}
                aria-pressed={recording}
                className={`grid h-20 w-20 touch-none select-none place-items-center rounded-full text-3xl transition ${
                  recording ? 'scale-110 bg-coral shadow-[0_0_0_10px_rgba(255,107,91,0.2)]' : 'bg-lime text-ink hover:scale-105'
                } disabled:opacity-40`}
              >
                🎙
              </button>
              <p className="text-xs text-muted">{recording ? 'Listening… release to send' : 'Hold to talk (or hold Space)'}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-4 py-3 text-center text-xs text-muted">
              {!canVoice ? 'Voice input isn’t supported in this browser (try Chrome, Edge or Safari). Text mode is on.' : 'Voice input is off. Text mode is on.'}
            </p>
          )}
          <form onSubmit={submitText} className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1200} placeholder="Or type what you’d say…" aria-label="Type your reply" className="h-11 flex-1 rounded-xl border border-line bg-ink-2 px-3 text-sm focus:border-violet focus:outline-none" />
            <button disabled={busy || !text.trim()} className="h-11 rounded-xl bg-violet px-4 font-bold disabled:opacity-40">Say</button>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={voiceOn} disabled={!support.synthesis} onChange={(e) => (setVoiceOn(e.target.checked), e.target.checked || stopSpeaking())} className="accent-lime" />
              Customer voice {support.synthesis ? '' : '(not supported)'}
            </label>
            <span>{session.turnsLeft} turns left</span>
            <button onClick={endCall} disabled={busy} className="rounded-lg bg-coral px-4 py-2 font-bold text-ink disabled:opacity-50">End call & get coaching</button>
          </div>
        </div>
      </div>

      <aside className="space-y-3">
        <Signals meters={session.meters} />
        {session.memory && (
          <Panel title="From your earlier chat">
            <p className="text-xs leading-relaxed text-muted">{session.memory}</p>
          </Panel>
        )}
        <div className="flex gap-1 rounded-xl border border-line bg-ink p-1 text-xs font-bold">
          {[['notes', 'Notes'], ['crm', 'CRM'], ['book', 'Book']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`flex-1 rounded-lg px-2 py-2 ${tab === id ? 'bg-violet' : 'text-muted hover:text-cream'}`}>{label}</button>
          ))}
        </div>
        {tab === 'notes' && (
          <Panel title="Call notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== session.notes && act('note', { text: notes })} rows={8} maxLength={2000} className="w-full rounded-lg border border-line bg-ink-2 p-2 text-sm" placeholder="Objections, commitments, follow-ups…" />
          </Panel>
        )}
        {tab === 'crm' && <CrmPanel crm={session.crm} busy={busy} terminology={session.pack.terminology} onSave={(crm) => act('crm_update', { crm })} />}
        {tab === 'book' && <NextStepBooker types={session.pack.nextStepTypes} busy={busy} agreed={session.agreedNextStep} onBook={(b) => act('book_next_step', b)} />}
      </aside>
    </div>
  )
}
