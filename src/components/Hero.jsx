import { Link } from 'react-router-dom'
import { Meter } from './ui'

export default function Hero() {
  return (
    <section id="top" className="grid-bg relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* glow blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet/30 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-lime/10 blur-[100px]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-2/80 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-violet-soft">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime" />
            Concept prototype · 15 playable levels
          </span>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
            SalesQuest <span className="text-lime">AI</span>
          </h1>
          <p className="mt-4 font-display text-2xl font-bold text-violet-soft sm:text-3xl">
            Learn to sell by playing.
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            A gamified sales training platform concept where every customer conversation becomes a chance to learn,
            improve, and level up.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#play"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-lime px-7 py-4 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition active:translate-y-1 active:shadow-none hover:-translate-y-0.5"
            >
              ▶ Play Level 1
            </a>
            <a
              href="#vision"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-line bg-ink-2/60 px-7 py-4 font-display text-lg font-bold text-cream transition hover:border-violet hover:bg-ink-3"
            >
              Explore the Vision →
            </a>
          </div>
          <Link to="/onboarding" className="mt-5 inline-block text-sm font-bold text-violet-soft underline-offset-4 hover:text-lime hover:underline">
            ✦ Personalise your career path: Levels 2–3 are free →
          </Link>
          <a href="#demo" className="mt-2 block text-sm font-bold text-lime underline-offset-4 hover:underline">
            ▶ Watch the 2-minute demo
          </a>
        </div>

        {/* Mock game preview card */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -left-6 -top-6 z-10 animate-float rounded-xl bg-violet px-3 py-2 font-mono text-xs font-bold shadow-xl [--r:-6deg]">
            +20 XP
          </div>
          <div className="absolute -right-4 bottom-16 z-10 animate-float rounded-xl bg-coral px-3 py-2 font-mono text-xs font-bold text-ink shadow-xl [--r:5deg] [animation-delay:1.5s]">
            Objection!
          </div>
          <div className="rotate-[2deg] rounded-3xl border border-line bg-ink-2 p-5 shadow-2xl shadow-violet/20 transition hover:rotate-0">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
              <span>Level 1 · The First Pitch</span>
              <span className="text-lime">Q 3/5</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-coral to-violet font-display text-lg font-bold">
                S
              </div>
              <div>
                <p className="font-bold">Sarah</p>
                <p className="text-xs text-muted">Operations Manager</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl rounded-tl-sm bg-ink-3 p-4 text-sm leading-relaxed">
              “We’re also looking at TaskFlow. They’re about 20% cheaper.”
            </div>
            <div className="mt-4 space-y-2">
              {['Reframe around value', 'Offer a discount', 'Criticise the competitor'].map((t, i) => (
                <div
                  key={t}
                  className={`rounded-xl border px-3 py-2.5 text-sm ${
                    i === 0 ? 'border-lime/60 bg-lime/10 text-cream' : 'border-line text-muted'
                  }`}
                >
                  <span className="mr-2 font-mono text-xs text-violet-soft">{'ABC'[i]}</span>
                  {t}
                </div>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Meter label="Trust" value={65} color="lime" />
              <Meter label="Patience" value={48} color="coral" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
