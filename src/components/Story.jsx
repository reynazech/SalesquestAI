import { howItWorks } from '../data/content'
import { Reveal, SectionHeading, Eyebrow } from './ui'

// Problem + Solution + How it works
export default function Story() {
  return (
    <>
      <section id="problem" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal className="rounded-3xl border border-line bg-ink-2 p-7 sm:p-10">
            <Eyebrow color="text-coral">The problem</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              Sales is learned in live deals. That’s an expensive classroom.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              Traditional sales training can be theoretical, repetitive, and difficult to practise safely. Beginners
              need opportunities to handle realistic customer scenarios without risking actual deals.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {['Slide decks instead of practice', 'Role-play that feels awkward and rare', 'Mistakes made in front of real buyers'].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="text-coral">✕</span>
                  <span className="text-cream/85">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal className="relative overflow-hidden rounded-3xl border border-violet/50 bg-gradient-to-br from-violet/25 via-ink-2 to-ink-2 p-7 sm:p-10">
            <Eyebrow>The solution</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
              A flight simulator for sales conversations.
            </h2>
            <p className="mt-5 leading-relaxed text-muted">
              A game-like environment where players face virtual buyers, choose responses, see consequences, and learn
              better sales strategies.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {['Realistic buyers with real objections', 'Instant consequences for every choice', 'Coaching after every mission'].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="text-lime">✓</span>
                  <span className="text-cream/85">{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section id="how" className="border-y border-line/60 bg-ink-2/50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <SectionHeading
              center
              eyebrow="How it works"
              title="Six steps from rookie to closer."
              intro="Every mission follows the same game loop, so practice becomes a habit."
            />
          </Reveal>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {howItWorks.map((s, i) => (
              <Reveal
                as="li"
                key={s.title}
                className="group relative rounded-2xl border border-line bg-ink p-6 transition hover:-translate-y-1 hover:border-violet"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{s.icon}</span>
                  <span className="font-mono text-xs font-bold text-line group-hover:text-violet-soft">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}
