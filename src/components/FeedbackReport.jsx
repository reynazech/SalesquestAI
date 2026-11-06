import { questions } from '../data/questions'
import { totalScore, rankFor, dealOutcome, buildFeedback } from '../data/scoring'
import { Meter } from './ui'

const toneStyles = {
  win: 'border-lime/60 bg-lime/10 text-lime',
  partial: 'border-sky/60 bg-sky/10 text-sky',
  stalled: 'border-violet/60 bg-violet/10 text-violet-soft',
  lost: 'border-coral/60 bg-coral/10 text-coral',
}

function List({ title, items, icon, color }) {
  return (
    <div className="rounded-3xl border border-line bg-ink p-6">
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-sm leading-relaxed text-cream/90">
            <span className={`mt-0.5 ${color}`}>{icon}</span>
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function FeedbackReport({ picks, meters, onRetry, onHome }) {
  const score = totalScore(picks)
  const rank = rankFor(score)
  const outcome = dealOutcome(score, picks, meters)
  const { strengths, improvements, tips } = buildFeedback(picks)

  return (
    <div className="animate-pop space-y-6">
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 font-mono text-xs text-muted">
        <span>ℹ️</span>
        Rule-based prototype coaching — generated from fixed scoring rules, not live AI feedback.
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Score card */}
        <div className="rounded-3xl border border-violet/60 bg-gradient-to-br from-violet/30 to-ink p-6 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-violet-soft">Overall score</p>
          <p className="mt-2 font-display text-8xl font-extrabold leading-none text-lime">{score}</p>
          <p className="font-mono text-sm text-muted">/ 100</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 font-display font-bold">
            {rank.emoji} {rank.title}
          </p>
          <div className="mt-6 space-y-3 text-left">
            <Meter label="Final trust" value={meters.trust} color="lime" />
            <Meter label="Final patience" value={meters.patience} color="coral" />
          </div>
        </div>

        <div className="space-y-6">
          {/* Outcome */}
          <div className={`rounded-3xl border p-6 ${toneStyles[outcome.tone]}`}>
            <p className="font-mono text-[11px] uppercase tracking-widest opacity-80">Simulated deal outcome</p>
            <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">{outcome.title}</p>
            <p className="mt-2 leading-relaxed text-cream/85">{outcome.text}</p>
          </div>

          {/* Decision breakdown */}
          <div className="rounded-3xl border border-line bg-ink p-6">
            <h3 className="font-display text-xl font-bold">Your decisions</h3>
            <ol className="mt-4 grid gap-2 sm:grid-cols-5">
              {picks.map((p, i) => (
                <li key={i} className="rounded-xl bg-ink-2 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Q{i + 1} · {questions[i].stage}</p>
                  <p className="mt-1 flex items-baseline justify-between">
                    <span className="font-mono text-sm text-violet-soft">Option {p.key}</span>
                    <span className={`font-display text-xl font-bold ${p.score === 20 ? 'text-lime' : p.score >= 10 ? 'text-sky' : 'text-coral'}`}>
                      {p.score}
                      <span className="text-xs text-muted">/20</span>
                    </span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <List title="What you did well" items={strengths} icon="✓" color="text-lime" />
        <List title="Areas to improve" items={improvements} icon="↗" color="text-coral" />
        <List title="Practical sales tips" items={tips} icon="💡" color="" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={onRetry}
          className="rounded-2xl bg-lime px-7 py-4 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-none"
        >
          ↺ Retry Level 1
        </button>
        <button
          onClick={onHome}
          className="rounded-2xl border border-line px-7 py-4 font-display text-lg font-bold transition hover:border-violet hover:bg-ink-3"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  )
}
