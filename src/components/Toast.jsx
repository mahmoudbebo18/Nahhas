import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

/** Brief, non-blocking confirmations. Errors that need a decision get a
 *  full inline error state instead — a toast is not a place to put a retry. */

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }

/* A toast is most often raised at the moment a sheet closes ("saved", then the
 * sheet slides away), so it has to stay legible on top of the sheet's dimmed
 * backdrop as well as on the plain page. That rules out a translucent tint:
 * the card is an opaque surface, and the tone lives in the icon chip and the
 * border instead of in the fill and the body text. */
const TONES = {
  success: { chip: 'bg-success/20 text-success', edge: 'border-success/40' },
  error: { chip: 'bg-danger/20 text-danger', edge: 'border-danger/40' },
  info: { chip: 'bg-surface-2 text-muted', edge: 'border-border-strong' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (message, { tone = 'info', duration = 3200 } = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, o) => push(m, { ...o, tone: 'success' }),
      error: (m, o) => push(m, { ...o, tone: 'error', duration: 5000 }),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Above the sheet (z-50) with headroom, and clear of the notch. */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center
                   gap-2.5 px-3 pt-safe-3"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }) {
  const reduce = useReducedMotion()
  const Icon = ICONS[toast.tone]
  const tone = TONES[toast.tone]

  // Drops in on a spring, but leaves on a short tween: an exit spring settles
  // slowly, and a toast that is on its way out should already be gone.
  const motionProps = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.12 } },
      }
    : {
        initial: { opacity: 0, y: -20, scale: 0.96 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 480, damping: 32, mass: 0.7 },
        },
        exit: {
          opacity: 0,
          y: -12,
          scale: 0.97,
          transition: { duration: 0.16, ease: 'easeIn' },
        },
      }

  return (
    <motion.div
      layout="position"
      {...motionProps}
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl
                  border bg-surface py-2.5 pe-2 ps-3 shadow-overlay ${tone.edge}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="flex-1 text-sm font-medium leading-snug text-text">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-subtle
                   transition-colors hover:bg-surface-2 hover:text-text"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
