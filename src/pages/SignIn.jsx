import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import GoogleSignIn from '../auth/GoogleSignIn'
import { Spinner } from '../App'

// Only same-site paths are allowed as redirect targets.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard')

export default function SignIn() {
  const { user, me, loading } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const next = safeNext(params.get('next'))

  if (loading) return <Spinner />
  if (user) return <Navigate to={me.needsOnboarding ? '/onboarding' : next} replace />

  return (
    <section className="grid-bg relative grid min-h-screen place-items-center overflow-hidden px-4 pt-20">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet/30 blur-[110px]" />
      <div className="animate-pop relative w-full max-w-md rounded-[2rem] border border-line bg-ink-2/90 p-8 text-center shadow-2xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-lime">Your sales academy</p>
        <h1 className="mt-3 font-display text-3xl font-bold">Sign in to SalesQuest</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Save your profile, unlock personalised missions and track your progress across devices.
        </p>
        <div className="mt-8">
          <GoogleSignIn onSignedIn={(m) => navigate(m?.needsOnboarding ? '/onboarding' : next, { replace: true })} />
        </div>
        <p className="mt-8 text-xs text-muted/80">We only use your Google name, email and photo to create your account.</p>
      </div>
    </section>
  )
}
