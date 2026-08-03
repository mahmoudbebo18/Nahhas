import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import {
  addDays,
  addMonths,
  dayLabel,
  dayNumber,
  isSameDay,
  monthGrid,
  monthLabel,
  parseISODate,
  todayISO,
  weekStartFor,
  weekdayLabels,
} from '@/lib/datetime'

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/**
 * Month grid.
 *
 * Replaces the browser's own calendar, which could not be styled and — worse —
 * followed the *browser's* locale rather than the app's: an engineer who had
 * switched the portal to Arabic still got English month names and a Sunday
 * week. This one reads both from `useI18n`, so the picker turns over with the
 * rest of the UI.
 *
 * Values in and out are "YYYY-MM-DD"; nothing here knows about time.
 */
export default function Calendar({ value, onSelect, min }) {
  const { lang, isRtl, t } = useI18n()

  const selected = parseISODate(value)
  const today = parseISODate(todayISO())
  const minDate = parseISODate(min)

  // The month on screen opens on the selected day, else on today — never on a
  // month the engineer has to navigate away from before they can start.
  const [cursor, setCursor] = useState(() => selected ?? today)
  // Roving tabindex: exactly one day is tabbable and the arrow keys move it.
  // 42 tab stops in the middle of a form would be its own kind of broken.
  const [focused, setFocused] = useState(() => selected ?? today)
  const gridRef = useRef(null)
  const moveFocus = useRef(false)

  const weekStart = weekStartFor(lang)
  const weekdays = useMemo(() => weekdayLabels(lang, weekStart), [lang, weekStart])
  const days = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth(), weekStart),
    [cursor, weekStart],
  )

  // Only pull DOM focus when the keyboard asked for it — doing it on every
  // `focused` change would steal focus the moment the panel opens.
  useEffect(() => {
    if (!moveFocus.current) return
    moveFocus.current = false
    gridRef.current?.querySelector('[data-day][tabindex="0"]')?.focus()
  }, [focused])

  const disabled = (d) => Boolean(minDate) && d < minDate

  function go(next) {
    if (disabled(next)) return
    moveFocus.current = true
    setFocused(next)
    // Letting the view follow the focus across a month boundary is what makes
    // arrow-key navigation feel like one continuous calendar, not 12 grids.
    if (next.getMonth() !== cursor.getMonth() || next.getFullYear() !== cursor.getFullYear()) {
      setCursor(new Date(next.getFullYear(), next.getMonth(), 1))
    }
  }

  function onKeyDown(e) {
    // Left/right are *visual*: the grid mirrors under RTL, so "tomorrow" is
    // the key pointing at the start of the line, not the end.
    const byDay = {
      ArrowRight: isRtl ? -1 : 1,
      ArrowLeft: isRtl ? 1 : -1,
      ArrowDown: 7,
      ArrowUp: -7,
    }[e.key]

    if (byDay !== undefined) {
      e.preventDefault()
      go(addDays(focused, byDay))
      return
    }
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault()
      go(addMonths(focused, e.key === 'PageUp' ? -1 : 1))
      return
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      const intoWeek = (focused.getDay() - weekStart + 7) % 7
      go(addDays(focused, e.key === 'Home' ? -intoWeek : 6 - intoWeek))
    }
  }

  const stepMonth = (n) => {
    const next = addMonths(cursor, n)
    setCursor(new Date(next.getFullYear(), next.getMonth(), 1))
  }

  // The whole of last month sitting before `min` means there is nothing to go
  // back to — an End date can never precede the Start it is bounded by.
  const prevBlocked =
    Boolean(minDate) && new Date(cursor.getFullYear(), cursor.getMonth(), 0) < minDate

  const navBtn =
    'flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:pointer-events-none disabled:opacity-25'

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center gap-1">
        <p className="flex-1 ps-1 text-[15px] font-semibold capitalize">{monthLabel(cursor, lang)}</p>
        <button
          type="button"
          onClick={() => stepMonth(-1)}
          disabled={prevBlocked}
          className={navBtn}
          aria-label={t('prevMonth')}
        >
          <ChevronLeft className="rtl-flip h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => stepMonth(1)} className={navBtn} aria-label={t('nextMonth')}>
          <ChevronRight className="rtl-flip h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1" aria-hidden>
        {weekdays.map((d, i) => (
          <div key={i} className="py-1 text-center text-[12px] font-semibold text-subtle">
            {d}
          </div>
        ))}
      </div>

      <div
        ref={gridRef}
        role="group"
        aria-label={monthLabel(cursor, lang)}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-1"
      >
        {days.map((day) => {
          const key = iso(day)
          const outside = day.getMonth() !== cursor.getMonth()
          const isSelected = isSameDay(day, selected)
          const isToday = isSameDay(day, today)
          const off = disabled(day)

          return (
            <motion.button
              key={key}
              type="button"
              data-day
              whileTap={off ? undefined : { scale: 0.9 }}
              tabIndex={isSameDay(day, focused) ? 0 : -1}
              disabled={off}
              aria-label={dayLabel(day, lang)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => {
                setFocused(day)
                onSelect(key)
              }}
              className={`tnum flex h-11 items-center justify-center rounded-xl text-[15px]
                          font-medium transition-colors focus-visible:ring-offset-0 ${
                            isSelected
                              ? 'bg-accent font-bold text-accent-fg'
                              : isToday
                                ? 'font-bold text-accent ring-1 ring-inset ring-accent/50 hover:bg-surface-2'
                                : outside
                                  ? 'text-subtle hover:bg-surface-2'
                                  : 'text-text hover:bg-surface-2'
                          } ${off ? 'pointer-events-none opacity-25' : ''}`}
            >
              {dayNumber(day, lang)}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
