import { useReducer } from 'react'

/**
 * Which groups on a screen are expanded.
 *
 * Kept in memory for the life of the tab — not per mount — so opening a draft
 * to fix it and coming back does not spring every group the engineer folded
 * away back open. Not persisted to storage: a fresh visit starting from the
 * defaults is the expected behaviour, not a lost preference.
 *
 * Only the groups the engineer has actually touched are stored; everything
 * else follows `defaultOpen`, so new groups arriving in a refetch fall in line.
 */
const memory = new Map()
const NONE = {}

export function useCollapsed(scope, defaultOpen = true) {
  const [, rerender] = useReducer((n) => n + 1, 0)
  const touched = memory.get(scope) ?? NONE

  const isOpen = (key) => touched[key] ?? defaultOpen
  const write = (patch) => {
    memory.set(scope, { ...(memory.get(scope) ?? NONE), ...patch })
    rerender()
  }

  return {
    isOpen,
    toggle: (key) => write({ [key]: !isOpen(key) }),
    setAll: (keys, open) => write(Object.fromEntries(keys.map((key) => [key, open]))),
  }
}
