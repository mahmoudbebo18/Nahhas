import { motion } from 'framer-motion'
import { AlertTriangle, Inbox, Loader2, RefreshCw, ShieldOff, WifiOff } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/* -- loading -------------------------------------------------------------- */

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}

/**
 * Skeleton rows rather than a bare spinner: the list keeps its shape, so the
 * screen doesn't jump when real data lands.
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="relative h-[4.5rem] overflow-hidden rounded-2xl border border-border bg-surface"
          style={{ opacity: 1 - i * 0.13 }}
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-surface-2 to-transparent" />
          <div className="flex h-full flex-col justify-center gap-2 px-4">
            <div className="h-3.5 w-2/5 rounded bg-surface-2" />
            <div className="h-3 w-1/4 rounded bg-surface-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function LoadingBlock({ label }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-muted">
      <Spinner />
      <span className="text-sm">{label ?? t('loading')}</span>
    </div>
  )
}

/* -- error ---------------------------------------------------------------- */

/**
 * One component for every failure mode, because the recovery differs:
 * 403 is a dead end (ask your PM), a network blip or 5xx deserves a retry
 * button, and a 400 means the input was wrong so retrying unchanged is futile.
 */
export function ErrorState({ error, onRetry, compact = false }) {
  const { t } = useI18n()

  const forbidden = error?.isForbidden
  const network = error?.isNetwork
  const canRetry = Boolean(onRetry) && (error?.isRetryable ?? true)

  const Icon = forbidden ? ShieldOff : network ? WifiOff : AlertTriangle
  const title = forbidden ? t('forbidden') : network ? t('offlineTitle') : t('somethingWentWrong')
  const body = forbidden
    ? t('forbiddenBody')
    : network
      ? t('offlineBody')
      : error?.message || t('somethingWentWrong')

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center rounded-2xl border border-danger/25 bg-danger/[0.06] text-center ${
        compact ? 'gap-2 p-4' : 'gap-3 p-6'
      }`}
      role="alert"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-danger/12 text-danger">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      </div>
      {canRetry && (
        <button type="button" onClick={onRetry} className="btn-outline mt-1">
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t('retry')}
        </button>
      )}
    </motion.div>
  )
}

/* -- empty ---------------------------------------------------------------- */

export function EmptyState({ title, body, icon: Icon = Inbox, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface/60 p-8 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-subtle">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div>
        <p className="font-semibold text-text">{title}</p>
        {body && <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>}
      </div>
      {action}
    </motion.div>
  )
}
