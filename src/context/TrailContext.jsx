import { createContext, useCallback, useContext, useMemo, useState } from 'react'

/**
 * The breadcrumb trail.
 *
 * Routes carry ids ("/items/482/subtasks"), but the engineer needs names
 * ("Tower B › Floor 03 › بند عمل 1"). Rather than re-fetching a parent list
 * just to resolve one label, each screen records the label as the engineer
 * passes through it. The trail is also mirrored into sessionStorage so a
 * mid-flow page refresh — or a deep link pasted between colleagues — still
 * shows a sensible breadcrumb.
 */

const TrailContext = createContext(null)

const STORE_KEY = 'nfp.trail'
const RANK = { project: 0, level: 1, item: 2, subtask: 3 }

function load() {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}
  } catch {
    return {}
  }
}

function persist(trail) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(trail))
  } catch {
    /* non-fatal: the breadcrumb just loses labels after a refresh */
  }
}

export function TrailProvider({ children }) {
  const [trail, setTrail] = useState(load)

  /**
   * Record a step. Everything deeper than the recorded step is dropped, so
   * backing out to a project and picking a different one can't leave a stale
   * floor name hanging on the end of the crumb.
   */
  const setStep = useCallback((kind, value) => {
    setTrail((prev) => {
      const rank = RANK[kind]
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (RANK[k] < rank) next[k] = v
      }
      next[kind] = value
      if (shallowEqual(prev, next)) return prev
      persist(next)
      return next
    })
  }, [])

  const clearFrom = useCallback((kind) => {
    setTrail((prev) => {
      const rank = RANK[kind]
      const next = {}
      for (const [k, v] of Object.entries(prev)) {
        if (RANK[k] < rank) next[k] = v
      }
      if (shallowEqual(prev, next)) return prev
      persist(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ trail, setStep, clearFrom }), [trail, setStep, clearFrom])
  return <TrailContext.Provider value={value}>{children}</TrailContext.Provider>
}

function shallowEqual(a, b) {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]))
}

export function useTrail() {
  const ctx = useContext(TrailContext)
  if (!ctx) throw new Error('useTrail must be used inside <TrailProvider>')
  return ctx
}
