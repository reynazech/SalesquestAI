import { useCallback, useState } from 'react'
import { post, ApiError } from '../lib/api'

// Shared mission actions. Every call returns the server's updated view.
export function useSim(session, setSession) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (fn) => {
      setBusy(true)
      setError('')
      try {
        const v = await fn()
        setSession(v)
        return v
      } catch (e) {
        if (e instanceof ApiError && e.data?.session) setSession(e.data.session)
        setError(e.message)
        return null
      } finally {
        setBusy(false)
      }
    },
    [setSession],
  )

  return {
    busy,
    error,
    setError,
    send: (text, voice = false) => run(() => post(`/sim/${session.id}/message`, { text, voice })),
    act: (type, payload = {}) => run(() => post(`/sim/${session.id}/action`, { type, ...payload })),
    finish: () => run(() => post(`/sim/${session.id}/finish`)),
  }
}
