import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { post } from '../lib/api'
import { industries, careerStatuses, skills } from '../training/options'
import { packMeta, packIdForProfile } from '../training/packs'

export default function Profile() {
  const { me, refresh } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  async function activate(id) {
    setBusy(id)
    await post(`/profiles/${id}/activate`)
    await refresh()
    setBusy(null)
  }

  return (
    <section className="grid-bg min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-lime">Training profiles</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Your industries & roles</h1>
          <button onClick={() => navigate('/onboarding?new=1')} className="rounded-xl bg-violet px-5 py-3 font-bold hover:brightness-110">
            + Add a training profile
          </button>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted">
          Switch profiles to train in a different industry. Every profile keeps its own attempts and progress; switching never deletes anything.
        </p>

        <div className="mt-8 space-y-4">
          {me.profiles.map((p) => {
            const prof = p.profile
            const active = me.activeProfile?.id === p.id
            const pack = packMeta[packIdForProfile(prof)]
            return (
              <div key={p.id} className={`rounded-3xl border p-6 ${active ? 'border-lime/60 bg-ink-2' : 'border-line bg-ink-2/60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-bold">
                        {industries.find((i) => i.id === prof.industry)?.icon} {prof.role || 'Untitled role'}
                      </h2>
                      {active && <span className="rounded-full bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">Active</span>}
                      {!p.complete && <span className="rounded-full bg-coral/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-coral">Incomplete</span>}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {industries.find((i) => i.id === prof.industry)?.label}
                      {prof.customIndustry ? ` (${prof.customIndustry})` : ''} · {prof.market?.toUpperCase()} ·{' '}
                      {careerStatuses.find((c) => c.id === prof.careerStatus)?.label} · {prof.region}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Track: {pack.icon} {pack.label} · Focus: {(prof.skills || []).map((s) => skills.find((x) => x.id === s)?.label).join(', ') || '—'}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">{p.attempts} saved attempt{p.attempts === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/onboarding?edit=${p.id}`} className="rounded-xl border border-line px-4 py-2 text-sm font-bold hover:border-violet">
                      Edit
                    </Link>
                    {!active && (
                      <button onClick={() => activate(p.id)} disabled={busy === p.id || !p.complete} className="rounded-xl bg-lime px-4 py-2 text-sm font-bold text-ink disabled:opacity-50">
                        {busy === p.id ? 'Switching…' : 'Switch to this'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
