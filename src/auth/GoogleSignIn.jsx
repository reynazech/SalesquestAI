import { useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const GSI_SRC = 'https://accounts.google.com/gsi/client'
let gsiPromise = null
const loadGsi = () =>
  (gsiPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Google sign-in'))
    document.head.appendChild(s)
  }))

// Google Identity Services button (ID-token flow). Falls back to a local
// dev sign-in only when the API reports DEV_LOGIN is enabled.
export default function GoogleSignIn({ onSignedIn }) {
  const { config, signInWithGoogle, devSignIn } = useAuth()
  const ref = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [devEmail, setDevEmail] = useState('demo@salesquest.test')
  // Keep the latest callback without re-initialising Google on every render.
  const onSignedInRef = useRef(onSignedIn)
  onSignedInRef.current = onSignedIn

  useEffect(() => {
    if (!config.googleClientId) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async ({ credential }) => {
            setBusy(true)
            setError('')
            try {
              onSignedInRef.current?.(await signInWithGoogle(credential))
            } catch (e) {
              setError(e.message)
            } finally {
              setBusy(false)
            }
          },
        })
        window.google.accounts.id.renderButton(ref.current, { theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', width: 280 })
      })
      .catch((e) => setError(e.message))
    return () => {
      cancelled = true
    }
  }, [config.googleClientId, signInWithGoogle])

  async function dev(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSignedIn?.(await devSignIn(devEmail))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {config.googleClientId ? (
        <div ref={ref} className="min-h-11" />
      ) : (
        <p className="max-w-xs rounded-xl border border-dashed border-line px-4 py-3 text-center text-sm text-muted">
          Google sign-in isn’t configured on this server yet.
        </p>
      )}
      {config.devLogin && (
        <form onSubmit={dev} className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-dashed border-coral/50 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-coral">Local dev sign-in (disabled in production)</p>
          <input
            value={devEmail}
            onChange={(e) => setDevEmail(e.target.value)}
            className="rounded-lg border border-line bg-ink px-3 py-2 text-sm"
            aria-label="Dev email"
          />
          <button disabled={busy} className="rounded-lg bg-ink-3 px-3 py-2 text-sm font-bold hover:bg-line">
            Dev sign-in
          </button>
        </form>
      )}
      {busy && <p className="text-sm text-muted">Signing you in…</p>}
      {error && <p className="text-sm text-coral">{error}</p>}
    </div>
  )
}
