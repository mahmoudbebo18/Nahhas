import { motion } from 'framer-motion'
import DatePicker from './DatePicker'
import { useI18n } from '@/context/I18nContext'
import { nowRounded, todayISO } from '@/lib/datetime'

/**
 * Date / date-and-time fields, plus a quick-set button.
 *
 * These used to be bare native inputs. Native pickers still win on *time* —
 * see the note in DatePicker — but the native calendar could not be themed and
 * ignored the app's own language toggle, so the date half is ours now. The
 * "Now"/"Today" button stays: most entries are logged as they happen, and one
 * tap should still cover that without opening anything.
 */

export function DateField({ id, value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-2">
      <DatePicker id={id} value={value} onChange={onChange} />
      <QuickSet onClick={() => onChange(todayISO())} label={t('today')} />
    </div>
  )
}

export function DateTimeField({ id, value, onChange, min }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-2">
      <DatePicker id={id} value={value} onChange={onChange} min={min} withTime />
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
