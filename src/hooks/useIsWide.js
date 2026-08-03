import { useEffect, useState } from 'react'

/**
 * Is the viewport at or past Tailwind's `sm`?
 *
 * A few components change *shape* rather than just style at that breakpoint —
 * a bottom sheet becomes a centred dialog, a picker sheet becomes a popover —
 * and the exit animation and the drag gesture have to follow. CSS alone can't
 * express that, so the query is read in JS.
 */
const WIDE = '(min-width: 640px)'

export function useIsWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)

  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const onChange = (e) => setWide(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return wide
}
