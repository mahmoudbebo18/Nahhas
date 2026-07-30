import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

/** Brief, non-blocking confirmations. Errors that need a decision get a
 *  full inline error state instead — a toast is not a place to put a retry. */

const ToastContext = createContext(null)

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const TONES = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-border bg-surface-2 text-text',
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
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex flex-col items-center gap-2 px-3 pt-3"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.tone]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-raised backdrop-blur ${TONES[t.tone]}`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="-me-1 rounded-lg p-1 opacity-70 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
