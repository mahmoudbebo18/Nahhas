import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { useIsWide } from '@/hooks/useIsWide'

/**
 * Enter on a spring — it is a gesture-like arrival and a little overshoot
 * reads as physical. Leave on a short tween, because `AnimatePresence` keeps
 * the node mounted until the animation *completes*, and a spring travelling
 * a full sheet-height takes half a second to settle: the panel would still be
 * gliding over a page that had already un-dimmed.
 */
function panelMotion({ reduce, wide }) {
  if (reduce) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.12 } },
    }
  }
  // Centred: `y: 100%` would only drop it by its own height, so it used to
  // wink out halfway down the screen. Scale and fade in place instead.
  if (wide) {
    return {
      initial: { opacity: 0, scale: 0.96, y: 16 },
      animate: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 440, damping: 34, mass: 0.8 },
      },
      exit: {
        opacity: 0,
        scale: 0.97,
        y: 8,
        transition: { duration: 0.16, ease: 'easeIn' },
      },
    }
  }
  return {
    initial: { y: '100%' },
    animate: { y: 0, transition: { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } },
    // No opacity here: it previously faded to 0.6 and then cut, which read as
    // a blink. A sheet that leaves the screen entirely doesn't need to fade.
    exit: { y: '100%', transition: { duration: 0.26, ease: [0.32, 0, 0.67, 0] } },
  }
}

/**
 * Bottom sheet — the mobile-first stand-in for a modal.
 *
 * Anchored to the bottom because that is where a thumb already is: the close
 * button is reachable one-handed, and a downward drag dismisses it. Content
 * scrolls inside the sheet so the page behind never moves.
 */
export default function Sheet({ open, onClose, title, children, footer }) {
  const reduce = useReducedMotion()
  const wide = useIsWide()
  const panel = panelMotion({ reduce, wide })

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Freeze the page behind so a scroll gesture can't chain through. It has
    // to be <html>, not <body>: <html> already carries `overflow-x: hidden`,
    // and a root that is not `visible` stops the body's overflow propagating
    // to the viewport — so locking the body alone leaves the page scrollable.
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      root.style.overflow = previous
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } }}
            // Held just long enough to still be dimming as the panel clears
            // the edge; the two used to finish nowhere near each other.
            exit={{ opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden
                       rounded-t-3xl border border-border bg-surface shadow-sheet
                       sm:rounded-3xl sm:shadow-modal"
            {...panel}
            // Drag-to-dismiss is a thumb gesture; on a centred desktop dialog
            // it only fights text selection. (Reduced motion still keeps it —
            // it is a way to close the sheet, not decoration.)
            drag={wide ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 700) onClose()
            }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="absolute inset-x-0 top-1.5 mx-auto h-1 w-10 rounded-full bg-border-strong sm:hidden" />
              <h2 className="flex-1 truncate pt-1 text-base font-semibold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="-me-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer && <div className="border-t border-border p-3 pb-safe">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
