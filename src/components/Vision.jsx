import { Link } from 'react-router-dom'
import { futureFeatures, businessModel } from '../data/content'
import { Reveal, SectionHeading, ConceptTag } from './ui'

const tagColor = {
  lime: 'bg-lime text-ink',
  sky: 'bg-sky text-ink',
  violet: 'bg-violet text-cream',
  coral: 'bg-coral text-ink',
}

// Future features + business model + payment roadmap
export default function Vision() {
  return (
    <>
      <section id="vision" className="border-y border-line/60 bg-ink-2/50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <SectionHeading
              eyebrow="Future product features"
              title="Where SalesQuest AI is heading."
              intro="These are planned features for later development phases. None of them are implemented in this prototype."
            />
            <ConceptTag>Planned · not implemented</ConceptTag>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {futureFeatures.map((f, i) => (
              <Reveal
                key={f.title}
                className={`rounded-2xl border border-dashed border-line bg-ink p-6 transition hover:border-violet ${
                  i === 0 ? 'sm:col-span-2 lg:row-span-2 lg:flex lg:flex-col lg:justify-end lg:bg-gradient-to-br lg:from-violet/25 lg:to-ink' : ''
                }`}
              >
                <span className={i === 0 ? 'text-5xl' : 'text-2xl'}>{f.icon}</span>
                <h3 className={`mt-3 font-display font-bold ${i === 0 ? 'text-2xl sm:text-3xl' : 'text-lg'}`}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="business" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <Reveal>
          <SectionHeading
            eyebrow="Business model"
            title="Free to start. Built to scale into teams."
            intro="A potential monetisation path from individual learners to corporate training."
          />
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-4">
          {businessModel.map((b, i) => (
            <Reveal key={b.title} className="relative rounded-3xl border border-line bg-ink-2 p-6" style={{ transitionDelay: `${i * 70}ms` }}>
              <span className={`inline-block rounded-md px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${tagColor[b.color]}`}>
                {b.tag}
              </span>
              <h3 className="mt-4 font-display text-xl font-bold">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
              <div className="mt-6 flex gap-1">
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= i ? 'bg-violet' : 'bg-ink-3'}`} />
                ))}
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6 flex items-start gap-3 rounded-2xl border border-line/80 bg-ink-2/50 p-5 text-sm text-muted">
          <span className="text-lg">🧪</span>
          <p>
            <strong className="text-cream">Assumptions, not results.</strong> Pricing, packaging and customer demand
            have not been tested yet and require validation through user research and pilots.
          </p>
        </Reveal>
      </section>

      <section id="premium" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="grid items-center gap-10 rounded-[2rem] border border-line bg-gradient-to-br from-ink-2 via-ink-2 to-violet/20 p-6 sm:p-10 lg:grid-cols-2">
          <Reveal>
            <SectionHeading
              eyebrow="Payment roadmap"
              title="Premium levels, later."
              intro="Levels 4–15 are premium. This prototype includes a clearly labelled demo checkout: no real payment is processed and no card details are collected."
            />
            <p className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-3 font-mono text-xs text-violet-soft">
              ⏳ Real payment gateway integration planned for a later development phase.
            </p>
          </Reveal>
          <Reveal className="mx-auto w-full max-w-sm">
            <div className="relative rounded-3xl border border-violet/60 bg-ink p-7 shadow-2xl shadow-violet/20">
              <span className="absolute -top-3 right-6 rounded-full bg-violet px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider">
                Mock preview
              </span>
              <p className="font-mono text-xs uppercase tracking-widest text-violet-soft">SalesQuest Premium</p>
              <p className="mt-3 font-display text-3xl font-bold">Pricing TBD</p>
              <p className="mt-1 text-sm text-muted">To be validated with learners and teams.</p>
              <ul className="mt-6 space-y-3 text-sm">
                {['Levels 4–15 premium missions', 'Advanced skill analytics', 'Badges & leaderboards', 'Unlimited replays'].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="text-violet-soft">◆</span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                to="/upgrade"
                className="mt-8 block w-full rounded-xl border border-violet/60 bg-violet/15 px-4 py-3 text-center font-bold text-violet-soft hover:bg-violet/25"
              >
                Try the demo checkout →
              </Link>
              <p className="mt-3 text-center text-[11px] text-muted/70">Demo only · no real payment · no card details collected</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
