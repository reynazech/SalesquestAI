import { useEffect, useRef } from 'react'

// Fades its children in when scrolled into view.
export function Reveal({ children, className = '', as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-visible')
          io.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function Eyebrow({ children, color = 'text-lime' }) {
  return (
    <p className={`font-mono text-xs font-bold uppercase tracking-[0.2em] ${color}`}>
      {children}
    </p>
  )
}

export function SectionHeading({ eyebrow, title, intro, center = false }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{intro}</p>}
    </div>
  )
}

export function Meter({ label, value, color }) {
  const bar = { lime: 'bg-lime', coral: 'bg-coral', sky: 'bg-sky', violet: 'bg-violet' }[color]
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted">
        <span>{label}</span>
        <span className="text-cream">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink-3">
        <div className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

// Small pill used to flag concept-only items.
export function ConceptTag({ children = 'Future concept' }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-muted/50 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
      <span className="h-1.5 w-1.5 rounded-full bg-muted" />
      {children}
    </span>
  )
}
