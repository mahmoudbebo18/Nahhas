import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CalendarDays, Clock } from 'lucide-react'
import Sheet from '@/components/Sheet'
import Calendar from './Calendar'
import { useIsWide } from '@/hooks/useIsWide'
import { useI18n } from '@/context/I18nContext'
import { formatDate, formatDateTime, nowRounded, todayISO } from '@/lib/datetime'

/**
 * The field an engineer taps to set a date, and the panel it opens.
 *
 * Phones get a bottom sheet — same thumb reasoning as everywhere else in the
 * app — and anything wider gets a popover anchored under the field. Both wrap
 * the one <Calendar>.
 *
 * `withTime` adds a clock row and switches the value to the "YYYY-MM-DDTHH:MM"
 * shape the equipment Start/End fields carry. The time itself stays a native
 * <input type="time">: on a phone that is the OS wheel, which is genuinely
 * better than anything worth hand-rolling, and on desktop it is a plain
 * segmented field — never the unstyleable dropdown the calendar was.
 */
export default function DatePicker({ id, value, onChange, min, withTime = false }) {
  const { t, lang } = useI18n()
  const wide = useIsWide()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)

  const [datePart = '', timePart = ''] = String(value || '').split('T')
  const [minDate = '', minTime = ''] = String(min || '').split('T')

  // A date with no time is not a value this field can emit, so the first tap
  // on the calendar has to supply one. "Now, to the nearest 5 minutes" is what
  // the Now button would have given them anyway.
  const commit = (nextDate, nextTime) => {
    if (!withTime) return onChange(nextDate)
    const time = nextTime || timePart || nowRounded().split('T')[1]
    onChange(`${nextDate}T${time}`)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  // Desktop only: a popover has to close on Escape and on a click that lands
  // anywhere else. The sheet already handles both itself.
  useEffect(() => {
    if (!open || !wide) return
    const onKey = (e) => e.key === 'Escape' && close()
    // No focus return on an outside click — the engineer is already on their
    // way to whatever they clicked, and yanking it back fights them.
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [open, wide])

  const Icon = withTime ? Clock : CalendarDays
  const label = value
    ? withTime
      ? formatDateTime(value, lang)
      : formatDate(value, lang)
    : t('pickDate')

  const panel = (
    <div className="space-y-3">
      <Calendar
        value={datePart}
        min={minDate}
        onSelect={(nextDate) => {
          commit(nextDate)
          // Date-only is a one-tap decision, so the panel gets out of the way.
          // With a time still to set, staying open is the whole point.
          if (!withTime) close()
        }}
      />

      {withTime && (
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <label htmlFor={`${id}-time`} className="field-label mb-0 flex-1">
            {t('time')}
          </label>
          <input
            id={`${id}-time`}
            type="time"
            value={timePart}
            // Only binding on the same day — an earlier date already carries
            // its own restriction and would otherwise block every clock hour.
            min={datePart && datePart === minDate ? minTime : undefined}
            onChange={(e) => commit(datePart || todayISO(), e.target.value)}
            className="input tnum w-auto shrink-0 px-3 text-center"
          />
        </div>
      )}

      <div className="flex gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => {
            commit(todayISO(), withTime ? nowRounded().split('T')[1] : undefined)
            close()
          }}
          className="btn-ghost h-11 min-h-0 flex-1 text-sm"
        >
          {withTime ? t('now') : t('today')}
        </button>
        <button type="button" onClick={close} className="btn-outline h-11 min-h-0 flex-1 text-sm">
          {t('done')}
        </button>
      </div>
    </div>
  )

  return (
    <div ref={wrapRef} className="relative flex-1">
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`input flex items-center gap-2.5 text-start ${
          open ? 'border-accent ring-2 ring-accent/30' : ''
        }`}
      >
        <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
        <span className={`tnum flex-1 truncate ${value ? 'text-text' : 'text-subtle'}`}>{label}</span>
      </button>

      {wide ? (
        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label={t('pickDate')}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: 'spring', stiffness: 500, damping: 34, mass: 0.7 },
              }}
              exit={{
                opacity: 0,
                y: -4,
                scale: 0.98,
                transition: { duration: 0.13, ease: 'easeIn' },
              }}
              className="absolute start-0 top-full z-40 mt-2 w-[19.5rem] rounded-2xl border
                         border-border bg-surface p-3 shadow-overlay"
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <Sheet open={open} onClose={close} title={t('pickDate')}>
          <div className="p-4">{panel}</div>
        </Sheet>
      )}
    </div>
  )
}
