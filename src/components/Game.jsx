import { useState } from 'react'
import { questions, scenario, START_TRUST, START_PATIENCE } from '../data/questions'
import { applyChoice, totalScore, dealOutcome } from '../data/scoring'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { post } from '../lib/api'
import { Meter, Eyebrow } from './ui'
import FeedbackReport from './FeedbackReport'

const initialMeters = { trust: START_TRUST, patience: START_PATIENCE }
const applyAll = (picks) => picks.reduce(applyChoice, initialMeters)

function moodFor({ trust, patience }) {
  if (patience <= 15) return { face: '😤', label: 'Losing patience' }
  if (trust >= 75) return { face: '😊', label: 'Engaged' }
  if (trust >= 50) return { face: '🙂', label: 'Interested' }
  if (trust >= 30) return { face: '🤨', label: 'Skeptical' }
  return { face: '😒', label: 'Unconvinced' }
}

function Delta({ label, value }) {
  if (value === 0) return <span className="rounded-md bg-ink-3 px-2 py-1 text-muted">{label} ±0</span>
  const up = value > 0
  return (
    <span className={`rounded-md px-2 py-1 ${up ? 'bg-lime/15 text-lime' : 'bg-coral/15 text-coral'}`}>
      {label} {up ? '+' : ''}
      {value}
    </span>
  )
}

export default function Game() {
  const [phase, setPhase] = useState('intro') // intro | playing | report
  const [step, setStep] = useState(0)
  const [picks, setPicks] = useState([])
  const [selected, setSelected] = useState(null)
  const [meters, setMeters] = useState(initialMeters)

  const { me } = useAuth()
  const navigate = useNavigate()
  const q = questions[step]
  const mood = moodFor(meters)

  // Signed-in players keep their Level 1 result in their progress.
  function saveAttempt(finalPicks) {
    const profile = me?.activeProfile
    if (!profile?.complete) return
    const score = totalScore(finalPicks)
    post('/attempts', {
      scenarioId: 'level-1',
      profileId: profile.id,
      score,
      outcome: dealOutcome(score, finalPicks, applyAll(finalPicks)).title,
      choices: finalPicks.map((p) => p.key),
    }).catch(() => {})
  }

  function start() {
    setPhase('playing')
    setStep(0)
    setPicks([])
    setSelected(null)
    setMeters(initialMeters)
  }

  function choose(option) {
    if (selected) return
    setSelected(option)
    setMeters((m) => applyChoice(m, option))
  }

  function next() {
    const updated = [...picks, selected]
    setPicks(updated)
    setSelected(null)
    if (step === questions.length - 1) {
      setPhase('report')
      saveAttempt(updated)
    } else {
      setStep(step + 1)
    }
    document.getElementById('play')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function backHome() {
    setPhase('intro')
    if (me) navigate('/dashboard')
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section id="play" className="scroll-mt-16 border-y border-line/60 bg-ink-2/50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Level 1 · Training Lab · Free</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">{scenario.title}</h2>
          </div>
          {phase === 'playing' && (
            <button onClick={start} className="rounded-full border border-line px-4 py-2 text-sm text-muted transition hover:border-coral hover:text-coral">
              ↺ Restart level
            </button>
          )}
        </div>

        {phase === 'intro' && (
          <div className="animate-pop grid gap-6 rounded-[2rem] border border-line bg-ink p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-violet-soft">Mission brief</p>
              <p className="mt-3 max-w-2xl text-lg leading-relaxed text-cream/90">{scenario.brief}</p>
              <ul className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
                {['5 decisions', '3 choices each', 'Trust & patience meters', 'Score out of 100'].map((t) => (
                  <li key={t} className="rounded-full border border-line px-3 py-1.5 text-muted">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={start}
              className="rounded-2xl bg-lime px-8 py-5 font-display text-xl font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
            >
              ▶ Start mission
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {/* Buyer panel */}
            <aside className="h-fit rounded-3xl border border-line bg-ink p-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                <div className="relative grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-coral to-violet font-display text-2xl font-bold">
                  S
                  <span key={mood.face} className="animate-pop absolute -bottom-2 -right-2 grid h-8 w-8 place-items-center rounded-full bg-ink-2 text-lg">
                    {mood.face}
                  </span>
                </div>
                <div className="lg:mt-3">
                  <p className="font-display text-lg font-bold">{scenario.buyer}</p>
                  <p className="text-xs leading-snug text-muted">{scenario.role}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-violet-soft">Mood: {mood.label}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1">
                <Meter label="Trust" value={meters.trust} color="lime" />
                <Meter label="Patience" value={meters.patience} color="coral" />
              </div>
            </aside>

            {/* Conversation panel */}
            <div key={step} className="animate-fade-up rounded-3xl border border-line bg-ink p-5 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-lime">
                  Question {step + 1} of {questions.length}
                </p>
                <p className="font-mono text-xs uppercase tracking-widest text-muted">{q.stage}</p>
              </div>
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < step || (i === step && selected) ? 'bg-lime' : i === step ? 'bg-violet' : 'bg-ink-3'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-7 flex gap-3">
                <span className="mt-1 hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral to-violet text-sm font-bold sm:grid">S</span>
                <p className="rounded-2xl rounded-tl-sm bg-ink-3 px-5 py-4 text-lg leading-relaxed">{q.prompt}</p>
              </div>

              <p className="mt-7 text-sm text-muted">How do you respond?</p>
              <div className="mt-3 space-y-3">
                {q.options.map((o) => {
                  const isPicked = selected?.key === o.key
                  const dimmed = selected && !isPicked
                  return (
                    <button
                      key={o.key}
                      onClick={() => choose(o)}
                      disabled={!!selected}
                      className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition ${
                        isPicked
                          ? 'border-violet bg-violet/15'
                          : dimmed
                            ? 'border-line/50 opacity-40'
                            : 'border-line hover:-translate-y-0.5 hover:border-violet-soft hover:bg-ink-2'
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg font-mono text-sm font-bold ${
                          isPicked ? 'bg-violet text-cream' : 'bg-ink-3 text-violet-soft'
                        }`}
                      >
                        {o.key}
                      </span>
                      <span className="leading-relaxed text-cream/90">{o.text}</span>
                    </button>
                  )
                })}
              </div>

              {selected && (
                <div className="animate-pop mt-6 rounded-2xl border border-line bg-ink-2 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-violet-soft">Sarah’s reaction</p>
                  <p className="mt-2 text-lg leading-relaxed">{selected.reaction}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex gap-2 font-mono text-xs font-bold">
                      <Delta label="Trust" value={selected.trust} />
                      <Delta label="Patience" value={selected.patience} />
                    </div>
                    <button
                      onClick={next}
                      className="rounded-xl bg-lime px-6 py-3 font-bold text-ink transition hover:brightness-110"
                    >
                      {step === questions.length - 1 ? 'See my report →' : 'Continue →'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'report' && <FeedbackReport picks={picks} meters={meters} onRetry={start} onHome={backHome} />}
      </div>
    </section>
  )
}
