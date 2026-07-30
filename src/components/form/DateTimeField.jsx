import { motion } from 'framer-motion'
import { CalendarDays, Clock } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { nowRounded, todayISO } from '@/lib/datetime'

/**
 * Native date / datetime-local inputs plus a quick-set button.
 *
 * Native pickers beat any JS calendar here: they are already localised, they
 * are the control the engineer's thumb knows, and they work offline-of-the-
 * -bundle. The "Now"/"Today" button covers the overwhelmingly common case in
 * one tap — most entries are logged as they happen.
 */

export function DateField({ id, value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <CalendarDays
          className="rtl-hide pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-subtle"
          aria-hidden
        />
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input tnum rtl-flush ps-9"
        />
      </div>
      <QuickSet onClick={() => onChange(todayISO())} label={t('today')} />
    </div>
  )
}

export function DateTimeField({ id, value, onChange, min }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Clock
          className="rtl-hide pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-subtle"
          aria-hidden
        />
        <input
          id={id}
          type="datetime-local"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="input tnum rtl-flush ps-9"
        />
      </div>
      <QuickSet onClick={() => onChange(nowRounded())} label={t('now')} />
    </div>
  )
}

function QuickSet({ onClick, label }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="btn-outline shrink-0 px-4 text-sm"
    >
      {label}
    </motion.button>
  )
}
