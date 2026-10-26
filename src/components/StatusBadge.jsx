import { scheduleStatus, taskStatus } from '@/lib/status'

/**
 * The one badge. Every state, flag and label pill in the app goes through
 * here, so they all share a height, a radius and a contrast that has been
 * checked (each tone clears 4.5:1 on its own tint, in both themes).
 */
const TONES = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
}

/**
 * The badges a task's box carries: its Odoo state when that is worth saying,
 * then where it stands against the plan (overdue, due today…). An array, for
 * a Tile's or ListRow's `badges`.
 */
export function taskBadges(task, t) {
  const status = taskStatus(task?.state)
  const schedule = scheduleStatus(task)
  return [
    status && (
      <StatusBadge key="state" tone={status.tone}>
        {t(status.key)}
      </StatusBadge>
    ),
    schedule && (
      <StatusBadge key="schedule" tone={schedule.tone}>
        {t(schedule.key)}
      </StatusBadge>
    ),
  ].filter(Boolean)
}

export default function StatusBadge({ tone = 'neutral', icon: Icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-badge px-2
                  text-meta font-semibold ${TONES[tone] ?? TONES.neutral} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </span>
  )
}
