import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { post, ApiError } from '../lib/api'
import { getLevel, missionCopy } from '../training/levels'
import { packMeta, packIdForProfile } from '../training/packs'
import { getPreviewPack } from '../lib/preview'
import Game from '../components/Game'
import Inbox from '../levels/Inbox'
import CallConsole from '../levels/CallConsole'
import Triage from '../levels/Triage'
import Mission from '../levels/Mission'
import { RULES } from '../training/rules'

const workspaces = { 2: Inbox, 3: CallConsole, 4: Triage }

function Shell({ children, wide = false }) {
  return (
    <section className="grid-bg min-h-screen px-3 pb-12 pt-20 sm:px-6">
      <div className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-4xl'}`}>
        <Link to="/dashboard" className="mb-4 inline-block text-sm text-muted hover:text-lime">← Dashboard</Link>
        {children}
      </div>
    </section>
  )
}

export function LockedLevel({ level, packId }) {
  const m = missionCopy(level.n, packId)
  return (
    <Shell>
      <div className="relative overflow-hidden rounded-[2rem] border border-violet/60 bg-gradient-to-br from-violet/25 to-ink-2 p-8 text-center sm:p-12">
        <p className="text-5xl">🔒</p>
        <p className="mt-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-violet-soft">Premium · Level {level.n}</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{m.title}</h1>
        <p className="mx-auto mt-3 max-w-lg text-muted">{m.brief}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted">Interface: {level.ui} · {level.mechanic}</p>
        <Link to="/upgrade" className="mt-8 inline-block rounded-2xl bg-lime px-8 py-4 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5">
          💎 Unlock Premium (demo checkout)
        </Link>
        <p className="mt-3 text-xs text-muted">Levels 1–3 are free forever.</p>
      </div>
    </Shell>
  )
}

export default function LevelPage() {
  const { n: nParam } = useParams()
  const n = Number(nParam)
  const level = getLevel(n)
  const { me } = useAuth()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    setSession(null)
    setError('')
    setLocked(false)
  }, [n])

  if (!level) return <Navigate to="/dashboard" replace />
  const preview = me.isAdmin ? getPreviewPack() : ''
  const packId = preview || packIdForProfile(me.activeProfile.profile)

  if (n === 1)
    return (
      <Shell>
        <div className="-mx-3 sm:-mx-6">
          <Game />
        </div>
      </Shell>
    )
  if (locked || (level.tier === 'premium' && me.tier !== 'premium')) return <LockedLevel level={level} packId={packId} />

  if (n >= 5)
    return (
      <Shell wide>
        <Mission level={n} industry={preview || undefined} onFinished={(r) => navigate(`/report/${r.id}`)} />
      </Shell>
    )

  async function start() {
    setStarting(true)
    setError('')
    try {
      setSession(await post('/sim/start', { level: n, ...(preview ? { industryOverride: preview } : {}) }))
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) setLocked(true)
      else if (e instanceof ApiError && e.data?.onboarding) navigate('/onboarding')
      else setError(e.message)
    } finally {
      setStarting(false)
    }
  }

  // A session from another level can linger for one render when the URL changes.
  if (!session || session.level !== n) {
    const m = missionCopy(n, packId)
    const pack = packMeta[packId]
    return (
      <Shell>
        <div className="animate-pop rounded-[2rem] border border-line bg-ink-2 p-6 sm:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-lime">
            Level {n} · {level.title} {preview && <span className="text-coral">· previewing {pack.label}</span>}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-5xl">{m.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-cream/90">{m.brief}</p>
          <p className="mt-3 max-w-2xl text-muted">
            You sell for <strong className="text-cream">{pack.seller}</strong> (fictional). {n === 4
              ? 'You have 12 messages and 5 research lookups. Gather evidence, rank the leads, then defend your ranking to your manager.'
              : 'Write in your own words, with no multiple choice. Use the tools, keep the CRM accurate and agree a real next step.'}
          </p>
          <div className="mt-6 rounded-2xl border border-lime/40 bg-lime/5 p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-lime">How to play</p>
            <ul className="mt-2 space-y-1 text-sm">{RULES[n].map((r) => <li key={r}>📌 {r}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">A coach bar will suggest your next move the whole time.</p>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
            {[level.ui, ...pack.tools.slice(0, 3), n === 3 ? 'Push-to-talk voice' : null].filter(Boolean).map((t) => (
              <li key={t} className="rounded-full border border-line px-3 py-1.5 text-muted">{t}</li>
            ))}
          </ul>
          <button onClick={start} disabled={starting} className="mt-8 rounded-2xl bg-lime px-8 py-4 font-display text-xl font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5 disabled:opacity-60">
            {starting ? 'Setting up…' : '▶ Start mission'}
          </button>
          {error && <p className="mt-4 text-sm text-coral">{error}</p>}
        </div>
      </Shell>
    )
  }

  const Workspace = workspaces[n]
  return (
    <Shell wide>
      <Workspace session={session} setSession={setSession} onFinished={(v) => navigate(`/report/${v.id}`)} />
    </Shell>
  )
}
