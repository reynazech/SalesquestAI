import { Reveal, SectionHeading } from './ui'

export default function DemoVideo() {
  return (
    <section id="demo" className="scroll-mt-16 mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-28">
      <Reveal>
        <SectionHeading center eyebrow="Watch the demo" title="See SalesQuest in 4 minutes." intro="A short introduction (the problem, who it’s for, the solution, the 15 levels and the outcomes), then a captioned walkthrough of the real app." />
      </Reveal>
      <Reveal className="mt-10">
        <div className="overflow-hidden rounded-[2rem] border border-violet/50 bg-ink-2 shadow-2xl shadow-violet/20">
          <video className="block aspect-video w-full" src="/demo/salesquest-demo.mp4" poster="/demo/poster.jpg" controls preload="none" playsInline>
            Your browser can’t play this video. <a href="/demo/salesquest-demo.mp4">Download it</a> instead.
          </video>
        </div>
        <p className="mt-3 text-center text-xs text-muted">Recorded from the live prototype. All companies and customers are fictional.</p>
      </Reveal>
    </section>
  )
}
