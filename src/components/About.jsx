import { Reveal, Eyebrow } from './ui'
import { Logo } from './Navbar'

export default function About() {
  return (
    <>
      <section id="about" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
        <Reveal className="grid items-center gap-8 rounded-[2rem] border border-line bg-ink-2 p-6 sm:p-10 md:grid-cols-[auto_1fr]">
          <div className="grid h-28 w-28 place-items-center rounded-[1.75rem] bg-gradient-to-br from-lime via-sky to-violet font-display text-5xl font-extrabold text-ink">
            R
          </div>
          <div>
            <Eyebrow>About the creator</Eyebrow>
            <p className="mt-3 font-display text-2xl font-bold leading-snug sm:text-3xl">
              Created by Reyna, a Business Analytics postgraduate with a background in technology, project coordination,
              and a passion for building practical learning experiences.
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
          <Logo />
          <p className="text-center font-mono text-xs">
            SalesQuest AI <span className="text-line">|</span> Concept Prototype <span className="text-line">|</span>{' '}
            Built with AI-assisted development
          </p>
        </div>
      </footer>
    </>
  )
}
