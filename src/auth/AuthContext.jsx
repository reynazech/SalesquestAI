import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, post } from '../lib/api'

const AuthContext = createContext(null)
const DRAFT_KEY = 'sq_onboarding_draft'

export const loadDraft = () => {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || null
  } catch {
    return null
  }
}
export const saveDraft = (d) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
  } catch {
    /* storage unavailable */
  }
}
export const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function AuthProvider({ children }) {
  const [me, setMe] = useState(null) // /api/me payload
  const [config, setConfig] = useState({ googleClientId: null, devLogin: false })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const data = await api('/me')
    setMe(data.user ? data : null)
    return data.user ? data : null
  }, [])

  useEffect(() => {
    Promise.all([refresh(), api('/auth/config').then(setConfig)])
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [refresh])

  // After any sign-in, save an onboarding draft completed before login.
  const afterSignIn = useCallback(async () => {
    const draft = loadDraft()
    if (draft?.complete) {
      await post('/profiles', { profile: draft.profile })
      clearDraft()
    }
    return refresh()
  }, [refresh])

  const signInWithGoogle = useCallback(async (credential) => {
    await post('/auth/google', { credential })
    return afterSignIn()
  }, [afterSignIn])

  const devSignIn = useCallback(async (email) => {
    await post('/auth/dev', { email })
    return afterSignIn()
  }, [afterSignIn])

  const logout = useCallback(async () => {
    await post('/auth/logout')
    setMe(null)
    window.google?.accounts?.id?.disableAutoSelect?.()
  }, [])

  return (
    <AuthContext.Provider value={{ me, user: me?.user || null, loading, config, refresh, signInWithGoogle, devSignIn, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
