import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Bottom sheet — the mobile-first stand-in for a modal.
 *
 * Anchored to the bottom because that is where a thumb already is: the close
 * button is reachable one-handed, and a downward drag dismisses it. Content
 * scrolls inside the sheet so the page behind never moves.
 */
export default function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    // Freeze the page behind so a scroll gesture can't chain through.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden
                       rounded-t-3xl border border-border bg-surface shadow-sheet sm:rounded-3xl"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
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
