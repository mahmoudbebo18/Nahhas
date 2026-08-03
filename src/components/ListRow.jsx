import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import Bidi from './Bidi'

/**
 * The drill-down row used by every picker in the walk.
 *
 * One row = one tap target, 64px+ tall, full width — sized for a gloved thumb
 * on a phone held one-handed. The chevron uses `rtl-flip` so it points the way
 * the flow actually goes in Arabic.
 */

/**
 * A brief cascade reads as "the list arrived" without delaying the first row.
 *
 * It is driven by the row's own index rather than by `staggerChildren` on the
 * <ul> for a reason: list data always lands *after* the list element has
 * mounted, and a child that inherits its variants from an already-mounted
 * parent is never told to run — it sits at the `initial` opacity of 0, blank
 * on screen but still tappable. Animating from the row itself makes the
 * reveal independent of when, and how often, the list gets refilled.
 */
const STEP = 0.035
const MAX_STEPS = 8 // a sixty-row project must not cascade for two seconds

function rowEnter(index = 0) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 420,
        damping: 34,
        delay: Math.min(index, MAX_STEPS) * STEP,
      },
    },
  }
}

export default function ListRow({
  title,
  subtitle,
  meta,
  badges,
  leading,
  onClick,
  disabled = false,
  /**
   * Recede without being switched off — for a row that still leads somewhere
   * useful but is not where the engineer is likely headed. `disabled` blocks
   * the tap; this only lowers the row's voice.
   */
  dimmed = false,
  selected = false,
  index = 0,
}) {
  return (
    <motion.button
      type="button"
      {...rowEnter(index)}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 600, damping: 30 }}
      onClick={onClick}
      disabled={disabled}
      className={`card theme-tint flex w-full items-center gap-3 p-4 text-start
                  transition-colors disabled:opacity-50
                  ${dimmed && !disabled ? 'opacity-60' : ''}
                  ${
                    selected
                      ? 'border-accent ring-2 ring-accent/25'
                      : 'active:bg-surface-2 sm:hover:border-border-strong'
                  }`}
    >
      {leading && <div className="shrink-0">{leading}</div>}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-tight">
          <Bidi>{title}</Bidi>
        </p>

        {subtitle && (
          <p className="mt-1 truncate text-[13px] text-muted">
            <Bidi>{subtitle}</Bidi>
          </p>
        )}

        {badges?.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {badges.map((b) => (
              <span
                key={b.key ?? b.label}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                  b.tone === 'accent'
                    ? 'bg-accent-soft text-accent'
                    : b.tone === 'muted'
                      ? 'bg-surface-2 text-muted'
                      : 'bg-primary-soft text-primary'
                }`}
              >
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {meta && <div className="shrink-0 text-end text-[13px] tnum text-muted">{meta}</div>}

      <ChevronRight className="rtl-flip h-5 w-5 shrink-0 text-subtle" aria-hidden />
    </motion.button>
  )
}
