import { CalendarDays } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { rangeParts } from '@/lib/datetime'

/**
 * A task's planned range, as the office set it in Odoo: "19 Oct → 26 Oct".
 *
 * The arrow is picked per language rather than mirrored: arrows are not
 * bidi-mirrored characters, so one glyph would point backwards in the other
 * script. A screen reader gets "from … to …" instead of "rightwards arrow".
 *
 * `inherited` marks dates borrowed from the work item because the sub-task
 * has none of its own. `prominent` is for where the range is the content (a
 * task's card) rather than a fact under a name.
 */
export default function DateRange({
  start,
  end,
  withTime = false,
  inherited = false,
  prominent = false,
  className = '',
}) {
  const { t, lang, isRtl } = useI18n()
  const parts = rangeParts(start, end, lang, { withTime })
  if (!parts) return null
  const { from, to, sameDay } = parts

  let shown
  let spoken
  if (sameDay) {
    shown = to ? `${from}–${to}` : from
    spoken = to ? `${from}–${to}` : from
  } else if (from && to) {
    shown = `${from} ${isRtl ? '←' : '→'} ${to}`
    spoken = `${t('rangeFrom')} ${from} ${t('rangeTo')} ${to}`
  } else if (to) {
    shown = spoken = `${t('rangeUntil')} ${to}`
  } else {
    shown = spoken = `${t('rangeFromOnly')} ${from}`
  }

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-1 ${
        prominent ? 'text-secondary text-text' : 'text-meta text-muted'
      } ${className}`}
    >
      <CalendarDays className={`h-4 w-4 shrink-0 ${prominent ? 'text-muted' : ''}`} aria-hidden />
      <span className="tnum min-w-0">
        <span aria-hidden>{shown}</span>
        <span className="sr-only">{spoken}</span>
        {inherited && <span> ({t('fromItem')})</span>}
      </span>
    </span>
  )
}
