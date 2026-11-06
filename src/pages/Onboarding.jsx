import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth, loadDraft, saveDraft, clearDraft } from '../auth/AuthContext'
import GoogleSignIn from '../auth/GoogleSignIn'
import { post, put } from '../lib/api'
import { Spinner } from '../App'
import {
  careerStatuses,
  industries,
  companyTypes,
  markets,
  dealSizes,
  channels,
  experienceLevels,
  skills,
  regions,
  languages,
  validateProfile,
} from '../training/options'
import { packMeta, packIdForProfile, inboxChannel } from '../training/packs'
import { missionCopy, currencyFor } from '../training/levels'

function Choice({ options, value, onChange, multi = false, columns = 'sm:grid-cols-3' }) {
  const selected = (id) => (multi ? (value || []).includes(id) : value === id)
  const toggle = (id) => {
    if (!multi) return onChange(id)
    // Functional update so rapid taps never work from a stale selection.
    onChange((prev = []) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  return (
    <div className={`grid gap-2 ${columns}`}>
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          onClick={() => toggle(o.id)}
          aria-pressed={selected(o.id)}
          className={`rounded-xl border px-4 py-3 text-left transition ${
            selected(o.id) ? 'border-lime bg-lime/10 text-cream' : 'border-line text-cream/85 hover:border-violet-soft'
          }`}
        >
          <span className="font-bold">
            {o.icon && <span className="mr-2">{o.icon}</span>}
            {o.label}
          </span>
          {(o.hint || o.years) && <span className="mt-0.5 block text-xs text-muted">{o.hint || o.years}</span>}
        </button>
      ))}
    </div>
  )
}

function Field({ label, hint, children, optional }) {
  return (
    <div className="space-y-2">
      <p className="font-display text-lg font-bold">
        {label} {optional && <span className="text-sm font-normal text-muted">(optional)</span>}
      </p>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      {children}
    </div>
  )
}

const input = 'w-full rounded-xl border border-line bg-ink px-4 py-3 text-cream placeholder:text-muted/60 focus:border-violet focus:outline-none'

export default function Onboarding() {
  const { user, me, loading, refresh } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = Number(params.get('edit')) || null
  const addNew = params.get('new') === '1'
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Prefill: editing an existing profile > incomplete active profile > local draft.
  useEffect(() => {
    if (loading || form) return
    const existing = editId ? me?.profiles?.find((p) => p.id === editId) : !addNew && me?.activeProfile && !me.activeProfile.complete ? me.activeProfile : null
    setForm(existing?.profile || (!addNew && loadDraft()?.profile) || { channels: [], skills: [] })
  }, [loading, me, editId, addNew, form])

  // Returning users with a complete profile skip onboarding.
  useEffect(() => {
    if (!loading && user && !editId && !addNew && me && !me.needsOnboarding) navigate('/dashboard', { replace: true })
  }, [loading, user, me, editId, addNew, navigate])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'function' ? v(f[k]) : v }))
  const pro = form?.careerStatus === 'professional'
  const result = useMemo(() => validateProfile(form || {}), [form])
  const missing = new Set(result.errors)

  useEffect(() => {
    if (form && !user) saveDraft({ profile: form, complete: result.complete })
  }, [form, user, result.complete])

  if (loading || !form) return <Spinner />

  const steps = [
    {
      title: 'Where are you in your sales career?',
      keys: ['careerStatus', 'role', 'experience'],
      body: (
        <>
          <Field label="I am a…">
            <Choice options={careerStatuses} value={form.careerStatus} onChange={set('careerStatus')} />
          </Field>
          {form.careerStatus && (
            <Field label={pro ? 'Your current role' : 'The role you want'}>
              <input className={input} value={form.role || ''} onChange={(e) => set('role')(e.target.value)} placeholder={pro ? 'e.g. Inside sales executive' : 'e.g. Business development representative'} maxLength={120} />
            </Field>
          )}
          {pro && (
            <Field label="Experience level">
              <Choice options={experienceLevels} value={form.experience} onChange={set('experience')} columns="grid-cols-2 sm:grid-cols-4" />
            </Field>
          )}
        </>
      ),
    },
    {
      title: 'What market do you sell in?',
      keys: ['industry', 'customIndustry', 'market', 'companyType'],
      body: (
        <>
          <Field label="Industry">
            <Choice options={industries} value={form.industry} onChange={set('industry')} />
          </Field>
          {form.industry === 'custom' && (
            <input className={input} value={form.customIndustry || ''} onChange={(e) => set('customIndustry')(e.target.value)} placeholder="Your industry" maxLength={120} />
          )}
          <Field label="Who do you sell to?">
            <Choice options={markets} value={form.market} onChange={set('market')} />
          </Field>
          <Field label={pro ? 'Your company type' : 'Company type you’re aiming for'} optional={!pro}>
            <Choice options={companyTypes} value={form.companyType} onChange={set('companyType')} />
          </Field>
        </>
      ),
    },
    {
      title: 'Who are your customers?',
      keys: ['products', 'typicalCustomer', 'dealSize', 'channels'],
      body: (
        <>
          <Field label={pro ? 'What do you sell?' : 'What would you like to sell?'}>
            <input className={input} value={form.products || ''} onChange={(e) => set('products')(e.target.value)} placeholder="e.g. Office furniture, HR software, apartments" maxLength={200} />
          </Field>
          <Field label="Your typical customer">
            <input className={input} value={form.typicalCustomer || ''} onChange={(e) => set('typicalCustomer')(e.target.value)} placeholder="e.g. Operations managers at mid-size firms" maxLength={200} />
          </Field>
          {form.market && form.market !== 'b2c' && (
            <Field label="Typical deal size" optional>
              <Choice options={dealSizes} value={form.dealSize} onChange={set('dealSize')} columns="grid-cols-2 sm:grid-cols-5" />
            </Field>
          )}
          <Field label="Main sales channels" hint="Pick all that apply.">
            <Choice options={channels} value={form.channels} onChange={set('channels')} multi />
          </Field>
        </>
      ),
    },
    {
      title: 'What do you want to get better at?',
      keys: ['skills', 'region', 'language'],
      body: (
        <>
          <Field label="Skills to improve" hint="Choose up to four.">
            <Choice options={skills} value={form.skills} onChange={(fn) => set('skills')((prev) => fn(prev).slice(0, 4))} multi columns="grid-cols-2 sm:grid-cols-4" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country / region">
              <select className={input} value={form.region || ''} onChange={(e) => set('region')(e.target.value)}>
                <option value="">Select…</option>
                {regions.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Preferred language">
              <select className={input} value={form.language || ''} onChange={(e) => set('language')(e.target.value)}>
                <option value="">Select…</option>
                {languages.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        </>
      ),
    },
  ]

  const isPreview = step === steps.length
  const current = steps[step]
  const stepValid = isPreview || current.keys.every((k) => !missing.has(k))
  const packId = packIdForProfile(form)
  const pack = packMeta[packId]

  async function save() {
    setSaving(true)
    setError('')
    try {
      if (editId) await put(`/profiles/${editId}`, { profile: form })
      else if (!addNew && me?.activeProfile && !me.activeProfile.complete) await put(`/profiles/${me.activeProfile.id}`, { profile: form })
      else await post('/profiles', { profile: form })
      clearDraft()
      await refresh()
      navigate(editId ? '/profile' : '/dashboard', { replace: true })
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <section className="grid-bg min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-lime">
            {editId ? 'Edit training profile' : addNew ? 'New training profile' : 'Personalise your training'}
          </p>
          <p className="font-mono text-xs text-muted">{isPreview ? 'Preview' : `Step ${step + 1} of ${steps.length}`}</p>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {[...steps, 0].map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-lime' : i === step ? 'bg-violet' : 'bg-ink-3'}`} />
          ))}
        </div>

        {!isPreview ? (
          <div key={step} className="animate-fade-up mt-8 space-y-7 rounded-[2rem] border border-line bg-ink-2/90 p-6 sm:p-10">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">{current.title}</h1>
            {current.body}
          </div>
        ) : (
          <div className="animate-fade-up mt-8 space-y-6 rounded-[2rem] border border-violet/50 bg-gradient-to-br from-violet/20 to-ink-2 p-6 sm:p-10">
            <h1 className="font-display text-3xl font-bold sm:text-4xl">Your personalised career path</h1>
            <p className="text-muted">
              Based on your answers you’ll train in the <strong className="text-cream">{pack.icon} {pack.label}</strong> track, selling {pack.sells} for
              the fictional company <strong className="text-cream">{pack.seller}</strong>.
              {form.industry === 'custom' || ['automotive', 'services', 'finance'].includes(form.industry) ? ' It’s the closest match to your industry; more tracks are planned.' : ''}
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[2, 3, 4].map((n) => {
                const m = missionCopy(n, packId)
                return (
                  <div key={n} className="rounded-2xl border border-line bg-ink p-4">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-violet-soft">Level {n}</p>
                    <p className="mt-1 font-display font-bold">{m.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{m.brief}</p>
                  </div>
                )
              })}
            </div>
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              <li>💬 Inbound channel: <strong>{inboxChannel(packId, form)}</strong></li>
              <li>💱 Prices shown in: <strong>{currencyFor(form.region).code}</strong></li>
              <li>🧰 Tools: <strong>{pack.tools.slice(0, 3).join(', ')}</strong></li>
              <li>🎯 Focus: <strong>{(form.skills || []).map((s) => skills.find((x) => x.id === s)?.label).join(', ')}</strong></li>
            </ul>
            {user ? (
              <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-lime px-6 py-4 font-display text-lg font-bold text-ink shadow-[0_6px_0_0_#8fae1c] transition hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto">
                {saving ? 'Saving…' : editId ? 'Save changes' : 'Save & open my academy →'}
              </button>
            ) : (
              <div className="rounded-2xl border border-line bg-ink p-6 text-center">
                <p className="mb-4 font-display text-lg font-bold">Sign in to save your path</p>
                <GoogleSignIn onSignedIn={() => navigate('/dashboard', { replace: true })} />
              </div>
            )}
            {error && <p className="text-sm text-coral">{error}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <button
            onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
            className="rounded-xl border border-line px-5 py-3 font-bold transition hover:border-violet"
          >
            ← Back
          </button>
          {!isPreview && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!stepValid}
              className="rounded-xl bg-violet px-6 py-3 font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {step === steps.length - 1 ? 'See my path →' : 'Continue →'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
