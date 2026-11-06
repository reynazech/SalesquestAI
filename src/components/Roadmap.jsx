import { Link } from 'react-router-dom'
import { levels } from '../training/levels'
import { Reveal, SectionHeading, ConceptTag } from './ui'

export default function Roadmap() {
  return (
    <section id="roadmap" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <SectionHeading
          eyebrow="The career roadmap"
          title="Fifteen levels. Four playable today."
          intro="Levels 1–3 are free. Level 4 is a playable premium mission. Levels 5–15 are planned and not yet built."
        />
      </Reveal>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((lvl, i) => {
          const playable = lvl.status === 'playable'
          const href = lvl.n === 1 ? '#play' : `/level/${lvl.n}`
          const card = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className={`font-display text-5xl font-extrabold leading-none ${playable ? 'text-lime' : 'text-line'}`}>
                  {String(lvl.n).padStart(2, '0')}
                </span>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${lvl.tier === 'free' ? 'bg-lime text-ink' : 'bg-violet/20 text-violet-soft'}`}>
                    {lvl.tier === 'free' ? 'Free' : '🔒 Premium'}
                  </span>
                  {playable ? (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-lime">Playable</span>
                  ) : (
                    <ConceptTag>Planned</ConceptTag>
                  )}
                </div>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">{lvl.title}</h3>
              <p className="mt-1 text-sm text-muted">{lvl.mechanic}</p>
            </>
          )
          const cls = `relative flex flex-col rounded-3xl border p-5 transition ${
            playable ? 'border-lime/50 bg-gradient-to-br from-lime/10 to-ink-2 hover:-translate-y-1' : 'border-line bg-ink-2'
          }`
          return (
            <Reveal key={lvl.n} style={{ transitionDelay: `${(i % 6) * 50}ms` }}>
              {playable ? (
                lvl.n === 1 ? <a href={href} className={cls}>{card}</a> : <Link to={href} className={cls}>{card}</Link>
              ) : (
                <div className={cls}>{card}</div>
              )}
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
