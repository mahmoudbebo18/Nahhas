import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UNAUTHORIZED_EVENT, getApiKey, setApiKey } from '@/lib/apiClient'
import { KEYS, readJson, writeJson } from '@/lib/storage'

/**
 * Holds the Bearer key and the identity it resolved to.
 *
 * The identity from /auth/whoami is cached so the app opens straight into the
 * project list instead of flashing a spinner on every launch. The API client
 * fires UNAUTHORIZED_EVENT the moment any request 401s, which is the single
 * place a dead key gets cleared — every screen then re-renders into setup.
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [key, setKey] = useState(() => getApiKey())
  const [identity, setIdentity] = useState(() => readJson(KEYS.identity))
  const [expired, setExpired] = useState(false)

  const signOut = useCallback(
    ({ expired: wasExpired = false } = {}) => {
      setApiKey(null)
      writeJson(KEYS.identity, null)
      setKey(null)
      setIdentity(null)
      setExpired(wasExpired)
      // Drop every cached read: the next engineer to sign in on this shared
      // site tablet must never see the previous one's projects.
      queryClient.clear()
    },
    [queryClient],
  )

  const signIn = useCallback((newKey, who) => {
    setApiKey(newKey)
    writeJson(KEYS.identity, who)
    setKey(newKey)
    setIdentity(who)
    setExpired(false)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => signOut({ expired: true })
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [signOut])

  const value = useMemo(
    () => ({
      key,
      identity,
      isAuthed: Boolean(key),
      expired,
      signIn,
      signOut,
      /** Keep the cached identity fresh when a later whoami returns. */
      refreshIdentity: (who) => {
        if (!who) return
        setIdentity(who)
        writeJson(KEYS.identity, who)
      },
    }),
    [key, identity, expired, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
