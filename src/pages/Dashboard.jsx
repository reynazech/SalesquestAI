import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar } from '../components/Navbar'
import { api } from '../lib/api'
import { levels, missionCopy } from '../training/levels'
import { packMeta, packIdForProfile } from '../training/packs'
import { industries } from '../training/options'
import { xpFrom, rankFor, achievementsFor, readinessFrom } from '../lib/progress'
import { barColor, scoreColor } from '../lib/rubric'
import { getPreviewPack, setPreviewPack } from '../lib/preview'

function LevelCard({ level, packId, best, premiumLocked }) {
  const m = missionCopy(level.n, packId)
  const planned = level.status === 'planned'
  const done = best != null
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={`font-display text-4xl font-extrabold leading-none ${done ? 'text-lime' : planned ? 'text-line' : 'text-violet-soft'}`}>
          {String(level.n).padStart(2, '0')}
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${level.tier === 'free' ? 'bg-lime/15 text-lime' : 'bg-violet/20 text-violet-soft'}`}>
            {level.tier === 'free' ? 'Free' : premiumLocked ? '🔒 Premium' : 'Premium'}
          </span>
          {planned && <span className="rounded-full border border-dashed border-muted/50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted">Planned</span>}
        </div>
      </div>
      <p className="mt-3 font-display font-bold leading-snug">{m.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{planned ? level.mechanic : m.brief}</p>
      <div className="mt-auto pt-4">
        {done ? (
          <div>
            <div className="flex justify-between font-mono text-[10px] uppercase text-muted">
              <span>Best</span>
              <span className={scoreColor(best)}>{best}/100</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-ink-3">
              <div className={`h-full rounded-full ${barColor(best)}`} style={{ width: `${best}%` }} />
            </div>
          </div>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {planned ? 'Not yet built' : premiumLocked ? 'Upgrade to play' : 'Not started'}
          </span>
        )}
      </div>
    </>
  )
  const cls = `flex min-h-48 flex-col rounded-2xl border p-4 transition ${
    planned ? 'border-dashed border-line bg-ink/40 opacity-70' : done ? 'border-lime/40 bg-ink hover:-translate-y-0.5' : 'border-line bg-ink hover:-translate-y-0.5 hover:border-violet'
  }`
  if (planned) return <div className={cls} aria-disabled="true">{body}</div>
  return (
    <Link to={premiumLocked ? '/upgrade' : `/level/${level.n}`} className={cls}>
      {body}
    </Link>
  )
}

export default function Dashboard() {
  const { me } = useAuth()
  const [data, setData] = useState(null)
  const [preview, setPreview] = useState(getPreviewPack())

  useEffect(() => {
    Promise.all([api('/progress'), api('/sim/history'), api('/attempts')]).then(([progress, history, attempts]) => setData({ progress, history, attempts }))
  }, [])

  const profile = me.activeProfile.profile
  const ownPack = packIdForProfile(profile)
  const packId = me.isAdmin && preview ? preview : ownPack
  const pack = packMeta[packId]
  const premium = me.tier === 'premium'
  const first = (me.user.name || '').split(' ')[0] || 'there'

  if (!data) return <div className="min-h-screen pt-24" />

  const mine = data.progress.filter((p) => p.profileId === me.activeProfile.id)
  const best = (n) => mine.find((p) => p.scenarioId === `level-${n}`)?.bestScore ?? null
  const xp = xpFrom(data.progress)
  const rank = rankFor(xp)
  const achievements = achievementsFor({ progress: data.progress, history: data.history, tier: me.tier })
  const readiness = readinessFrom(data.history)
  const playable = levels.filter((l) => l.status === 'playable')
  const completed = playable.filter((l) => best(l.n) != null).length
  const nextLevel = playable.find((l) => best(l.n) == null && (l.tier === 'free' || premium))
  const industryLabel = industries.find((i) => i.id === profile.industry)?.label

  const recent = [...data.history]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((h) => {
      const prev = data.history.filter((x) => x.level === h.level && x.createdAt < h.createdAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
      return { ...h, delta: prev ? h.score - prev.score : null }
    })

  return (
    <section className="grid-bg min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px] [&>*]:min-w-0">
          <div className="flex flex-col gap-5 rounded-[2rem] border border-line bg-gradient-to-br from-violet/25 to-ink-2 p-6 sm:flex-row sm:items-center sm:p-8">
            <Avatar user={me.user} size="h-16 w-16" />
            <div className="flex-1">
              <p className="font-mono text-xs uppercase tracking-widest text-lime">{rank.title}</p>
              <h1 className="mt-1 font-display text-3xl font-bold sm:text-4xl">Welcome back, {first}</h1>
              <p className="mt-2 text-sm text-muted">
                {pack.icon} {pack.label} track · {profile.role} · {industryLabel}
                {profile.industry === 'custom' && profile.customIndustry ? ` (${profile.customIndustry})` : ''}
              </p>
            </div>
            {nextLevel && (
              <Link to={`/level/${nextLevel.n}`} className="rounded-2xl bg-lime px-6 py-4 text-center font-display font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5">
                ▶ Play Level {nextLevel.n}
              </Link>
            )}
          </div>
          <div className="rounded-[2rem] border border-line bg-ink-2 p-6">
            <div className="flex items-baseline justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Experience</p>
              <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${premium ? 'bg-violet text-cream' : 'bg-ink-3 text-muted'}`}>
                {premium ? `Premium${me.tierSource === 'demo_checkout' ? ' (demo)' : ''}` : 'Free plan'}
              </span>
            </div>
            <p className="mt-2 font-display text-4xl font-extrabold text-lime">{xp.toLocaleString()} XP</p>
            {rank.next && (
              <>
                <div className="mt-3 h-2 rounded-full bg-ink-3">
                  <div className="h-full rounded-full bg-lime" style={{ width: `${Math.min(100, ((xp - rank.floor) / (rank.next - rank.floor)) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">{(rank.next - xp).toLocaleString()} XP to {rank.nextTitle}</p>
              </>
            )}
            <p className="mt-3 text-sm text-muted">{completed} of {playable.length} playable levels completed</p>
            {!premium && (
              <Link to="/upgrade" className="mt-4 block rounded-xl border border-violet/60 px-4 py-2.5 text-center text-sm font-bold text-violet-soft hover:bg-violet/10">
                💎 Unlock Levels 4–15
              </Link>
            )}
          </div>
        </div>

        {me.isAdmin && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-coral/60 bg-coral/5 px-4 py-3 text-sm">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-coral">Demo admin</span>
            <label htmlFor="preview" className="text-muted">Preview industry:</label>
            <select
              id="preview"
              value={preview}
              onChange={(e) => {
                setPreview(e.target.value)
                setPreviewPack(e.target.value)
              }}
              className="rounded-lg border border-line bg-ink px-3 py-1.5"
            >
              <option value="">My profile ({packMeta[ownPack].label})</option>
              {Object.entries(packMeta).map(([id, p]) => (
                <option key={id} value={id}>{p.icon} {p.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted">Changes mission content for this tab only. Your profile is not modified.</span>
          </div>
        )}

        {/* Career map */}
        <div className="rounded-[2rem] border border-line bg-ink-2/70 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-lime">Career map</p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">15 levels from rookie to sales ops</h2>
            </div>
            <p className="text-xs text-muted">Levels 1–4 are playable. Levels 5–15 are planned and not yet built.</p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {levels.map((l) => (
              <LevelCard key={l.n} level={l} packId={packId} best={best(l.n)} premiumLocked={l.tier === 'premium' && !premium} />
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
          {/* Readiness */}
          <div className="rounded-[2rem] border border-line bg-ink-2 p-6">
            <h3 className="font-display text-xl font-bold">Sales readiness report</h3>
            <p className="mt-1 text-xs text-muted">Average of your latest attempt per mission. Rule-based training heuristics.</p>
            {readiness ? (
              <div className="mt-5 space-y-3">
                {readiness.map((d) => (
                  <div key={d.id}>
                    <div className="flex justify-between text-sm">
                      <span>{d.label}</span>
                      <span className={`font-mono ${scoreColor(d.score)}`}>{d.score}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-ink-3">
                      <div className={`h-full rounded-full ${barColor(d.score)}`} style={{ width: `${d.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Finish Level 2 to see your first readiness report.</p>
            )}
          </div>

          {/* Recent attempts */}
          <div className="rounded-[2rem] border border-line bg-ink-2 p-6">
            <h3 className="font-display text-xl font-bold">Recent missions</h3>
            {recent.length ? (
              <ul className="mt-4 divide-y divide-line">
                {recent.map((h) => (
                  <li key={h.id}>
                    <Link to={`/report/${h.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-lime">
                      <div className="min-w-0">
                        <p className="truncate font-bold">L{h.level} · {missionCopy(h.level, h.pack).title}</p>
                        <p className="truncate text-xs text-muted">{h.outcome} · {new Date(h.createdAt + 'Z').toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-display text-xl font-bold ${scoreColor(h.score)}`}>{h.score}</p>
                        {h.delta != null && (
                          <p className={`font-mono text-[10px] ${h.delta >= 0 ? 'text-lime' : 'text-coral'}`}>
                            {h.delta >= 0 ? '▲' : '▼'} {Math.abs(h.delta)} vs last
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No missions yet. Start with Level 1 or 2.</p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="rounded-[2rem] border border-line bg-ink-2 p-6">
          <h3 className="font-display text-xl font-bold">Achievements</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {achievements.map((a) => (
              <div key={a.id} className={`rounded-2xl border p-4 text-center ${a.earned ? 'border-lime/50 bg-lime/5' : 'border-line opacity-50 grayscale'}`}>
                <p className="text-3xl">{a.icon}</p>
                <p className="mt-2 text-sm font-bold">{a.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
