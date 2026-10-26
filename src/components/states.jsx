import { AlertTriangle, Inbox, Loader2, RefreshCw, ShieldOff, WifiOff } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/* -- loading -------------------------------------------------------------- */

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />
}

/** A grey bar with the sweep across it. */
function Bone({ className }) {
  return <div className={`rounded-badge bg-surface-2 ${className}`} />
}

function Sweep() {
  return (
    <div className="shimmer-sweep absolute inset-0 bg-gradient-to-r from-transparent via-surface-2 to-transparent" />
  )
}

/**
 * Skeleton rows rather than a bare spinner: the list keeps its shape, so the
 * screen doesn't jump when real data lands.
 */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="relative h-20 overflow-hidden rounded-card border border-border bg-surface">
          <Sweep />
          <div className="flex h-full flex-col justify-center gap-2 px-4">
            <Bone className="h-4 w-2/5" />
            <Bone className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * The tile grid's skeleton: same columns, same card, a title that wraps to
 * two lines and the fact row at the bottom — so the first paint already has
 * the shape of the answer.
 */
export function TileGridSkeleton({ count = 6 }) {
  return (
    <div className="tile-grid" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative flex h-32 flex-col gap-2 overflow-hidden rounded-card border border-border bg-surface p-4"
        >
          <Sweep />
          <Bone className="h-4 w-4/5" />
          <Bone className="h-4 w-1/2" />
          <Bone className="mt-auto h-3 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function LoadingBlock({ label }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-muted">
      <Spinner />
      <span className="text-secondary">{label ?? t('loading')}</span>
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
    <div
      className={`flex flex-col items-center rounded-card border border-danger/25 bg-danger/5 text-center ${
        compact ? 'gap-2 p-4' : 'gap-3 p-6'
      }`}
      role="alert"
    >
      <Icon className="h-6 w-6 text-danger" aria-hidden />
      <div>
        <p className="font-semibold text-text">{title}</p>
        <p className="mt-1 text-secondary text-muted">{body}</p>
      </div>
      {canRetry && (
        <button type="button" onClick={onRetry} className="btn-outline">
          <RefreshCw className="h-4 w-4" aria-hidden />
          {t('retry')}
        </button>
      )}
    </div>
  )
}

/* -- empty ---------------------------------------------------------------- */

export function EmptyState({ title, body, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong p-8 text-center">
      <Icon className="h-6 w-6 text-subtle" aria-hidden />
      <div>
        <p className="font-semibold text-text">{title}</p>
        {body && <p className="mt-1 text-secondary text-muted">{body}</p>}
      </div>
      {action}
    </div>
  )
}
