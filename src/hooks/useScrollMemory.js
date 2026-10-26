import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Where the page is scrolled to when a screen appears.
 *
 * The app is one page, so moving between screens never reloads it and the
 * window keeps whatever scroll the last screen left behind — a new list
 * opened from the middle of a long one opened in its middle too. So:
 *
 *   - going forward (a tap, a link) starts the new screen at the top;
 *   - going back (the back button, the phone's back gesture) returns to where
 *     the engineer was on that screen, so a long list is not lost.
 *
 * Called from <Screen>, not once at the router, on purpose: screens change
 * with an exit animation (AnimatePresence mode="wait"), and scrolling the
 * moment the URL changes would throw the outgoing screen to the top while it
 * is still on view. Each screen is rendered with its own location, so this
 * runs when the new one mounts. Keyed on `location.key`, not the path, so a
 * screen that changes only its query string (the legacy task tree) counts as
 * a new place too.
 *
 * Positions live in memory for the life of the tab, per history entry.
 */
const positions = new Map()

/** How long a returning screen keeps trying to reach its old position. */
const RESTORE_WINDOW_MS = 600

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  // The browser's own restoration fires before the new screen has rendered
  // and fights the code below; this hook owns it instead.
  window.history.scrollRestoration = 'manual'
}

export function useScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const { key } = location

  useLayoutEffect(() => {
    const saved = navigationType === 'POP' ? positions.get(key) : undefined
    window.scrollTo(0, saved ?? 0)
    if (!saved) return undefined

    // Part of a screen renders a frame or two after it mounts, so the page
    // can still be too short to reach the old position — the browser clamps,
    // and the engineer lands a little above where they were. Keep trying for
    // a moment, and give up the instant they scroll for themselves.
    const until = performance.now() + RESTORE_WINDOW_MS
    let frame = requestAnimationFrame(function retry() {
      if (Math.abs(window.scrollY - saved) <= 1 || performance.now() > until) return
      window.scrollTo(0, saved)
      frame = requestAnimationFrame(retry)
    })
    const stop = () => cancelAnimationFrame(frame)
    const events = ['wheel', 'touchstart', 'keydown']
    events.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }))
    return () => {
      stop()
      events.forEach((e) => window.removeEventListener(e, stop))
    }
    // navigationType is read for the arrival only; a later change belongs to
    // the next screen, not this one.
  }, [key])

  useEffect(() => {
    let frame = 0
    const remember = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => positions.set(key, window.scrollY))
    }
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', remember)
    }
  }, [key])
}
