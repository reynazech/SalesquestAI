import { useState } from 'react'
import { Panel } from './tools'
import { hintsFor } from './hints'

function CopyButton({ text }) {
  const [state, setState] = useState('Copy')
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setState('Copied ✓')
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      setState(ok ? 'Copied ✓' : 'Select & copy')
    }
    setTimeout(() => setState('Copy'), 1500)
  }
  return (
    <button type="button" onClick={copy} className="rounded-md border border-line px-2 py-0.5 text-[10px] font-bold hover:border-sky">
      {state}
    </button>
  )
}

// Optional coaching hints. "Use" puts the example in the right input; "Copy" copies it.
export default function HintsPanel({ level, packId, customerName, onInsert }) {
  const h = hintsFor(level, packId, customerName)
  const [open, setOpen] = useState(0)
  return (
    <Panel title="💡 Hints" right={<span className="font-mono text-[9px] uppercase text-muted">Optional</span>}>
      <p className="text-xs text-muted">{h.intro}</p>
      <ol className="mt-3 space-y-1.5">
        {h.steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-line">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold">
              <span className="font-mono text-[10px] text-lime">{i + 1}</span>
              <span className="flex-1">{s.title}</span>
              <span className="text-xs text-muted">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <div className="space-y-2 px-3 pb-3">
                <p className="text-xs text-muted">{s.tip}</p>
                {s.examples.map((ex) => (
                  <div key={ex} className="rounded-lg bg-ink-2 p-2.5">
                    <p className="select-all text-xs leading-relaxed text-cream/90">{ex}</p>
                    <div className="mt-2 flex gap-2">
                      {onInsert && (
                        <button type="button" onClick={() => onInsert(ex, s.target)} className="rounded-md bg-violet/25 px-2 py-0.5 text-[10px] font-bold text-violet-soft hover:bg-violet/40">
                          Use
                        </button>
                      )}
                      <CopyButton text={ex} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer font-bold text-coral">Avoid (costs points)</summary>
        <ul className="mt-2 space-y-1 text-muted">
          {h.avoid.map((a) => <li key={a}>✗ {a}</li>)}
        </ul>
      </details>
    </Panel>
  )
}
