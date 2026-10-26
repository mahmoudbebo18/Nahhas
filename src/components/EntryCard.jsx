import { Pencil, Trash2 } from 'lucide-react'
import { ENTRY_TYPES } from '@/api/entryTypes'
import { useI18n } from '@/context/I18nContext'
import Bidi from './Bidi'
import Checkbox from './Checkbox'
import { formatNumber } from '@/lib/text'
import { formatDate, formatDurationHours } from '@/lib/datetime'

/**
 * One logged entry, as it appears in the review basket.
 *
 * Draft rows carry Edit / Delete; confirmed rows are inert — once the office
 * can see a number, changing it silently from a phone is not something this
 * portal should be able to do. It stays a row, not a tile: the actions need
 * the width, and a basket is read top to bottom like a receipt.
 *
 * `showContext` puts the sub-task the entry was logged against on the card.
 * Drafts don't need it — they are grouped under that heading already — but a
 * flat history list otherwise reads as a pile of quantities with no answer to
 * "which sub-task was this?".
 *
 * `selectable` adds the checkbox that decides whether this draft goes in the
 * next batch to the office.
 */
export default function EntryCard({
  entry,
  readOnly = false,
  showContext = false,
  selectable = false,
  selected = false,
  onSelectChange,
  onEdit,
  onDelete,
}) {
  const { t, lang } = useI18n()
  const config = ENTRY_TYPES[entry.type] ?? {}
  const Icon = config.icon

  // Sub-task first: it is the one the engineer actually chose. Building and
  // project trail behind it and are the first to be truncated away.
  const context = [entry.task, entry.building, entry.project].filter(Boolean).join(' · ')

  // Only the facts that type actually records — a material row has no
  // duration, an equipment row has no amount.
  const facts = [
    entry.qty ? `${formatNumber(entry.qty, lang)}${entry.uom ? ` ${entry.uom}` : ''}` : null,
    entry.amount
      ? `${formatNumber(entry.amount, lang)}${entry.currency ? ` ${entry.currency}` : ''}`
      : null,
    entry.duration ? formatDurationHours(entry.duration, lang) : null,
    entry.date ? formatDate(entry.date, lang) : null,
    entry.attachment_ids?.length > 0
      ? `${entry.attachment_ids.length} ${t('attachments').toLowerCase()}`
      : null,
  ].filter(Boolean)

  return (
    <div
      className={`card p-4 transition-colors ${
        selectable && selected ? 'border-primary bg-primary/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          // The box keeps its 44px tap area; the negative margin lines its
          // centre up with the first line of text instead of hanging below it.
          <Checkbox
            className="-my-3 shrink-0"
            checked={selected}
            onChange={(next) => onSelectChange?.(next)}
            srLabel={`${t('selectEntry')}: ${entry.product || t(entry.type ?? 'saved')}`}
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-2">
            {/* The type icon tells material from expense at a glance; it is
                plain, because the type is a fact, not an alert. */}
            {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted" aria-label={t(entry.type)} />}
            <span className="min-w-0 flex-1 break-words font-semibold">
              <Bidi>{entry.product || t(entry.type ?? 'saved')}</Bidi>
            </span>
          </p>

          {showContext && context && (
            <p className="mt-1 truncate text-meta text-muted">
              <Bidi>{context}</Bidi>
            </p>
          )}

          {facts.length > 0 && (
            <p className="tnum mt-1 text-secondary text-muted">{facts.join(' · ')}</p>
          )}

          {entry.comments && (
            <p className="mt-1 line-clamp-2 text-secondary text-muted">
              <Bidi>{entry.comments}</Bidi>
            </p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <button type="button" onClick={onEdit} className="btn-outline min-h-touch flex-1 text-secondary">
            <Pencil className="h-4 w-4" aria-hidden />
            {t('editEntry')}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('deleteEntry')}
            className="btn-danger min-h-touch w-touch shrink-0 px-0"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}
