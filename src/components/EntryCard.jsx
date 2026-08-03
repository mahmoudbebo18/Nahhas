import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'
import { ENTRY_TYPES } from '@/api/entryTypes'
import { useI18n } from '@/context/I18nContext'
import Bidi from './Bidi'
import { formatNumber } from '@/lib/text'
import { formatDate, formatDurationHours } from '@/lib/datetime'

/**
 * One logged entry, as it appears in the review basket.
 *
 * Draft rows carry Edit / Delete; confirmed rows are inert — once the office
 * can see a number, changing it silently from a phone is not something this
 * portal should be able to do.
 */
export default function EntryCard({ entry, index = 0, readOnly = false, onEdit, onDelete }) {
  const { t, lang } = useI18n()
  const config = ENTRY_TYPES[entry.type] ?? {}
  const Icon = config.icon
  const accent = config.tone === 'accent'

  // Only the facts that type actually records — a material row has no
  // duration, an equipment row has no amount.
  const facts = [
    entry.qty ? `${formatNumber(entry.qty, lang)}${entry.uom ? ` ${entry.uom}` : ''}` : null,
    entry.amount
      ? `${formatNumber(entry.amount, lang)}${entry.currency ? ` ${entry.currency}` : ''}`
      : null,
    entry.duration ? formatDurationHours(entry.duration, lang) : null,
    entry.date ? formatDate(entry.date, lang) : null,
  ].filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 420,
          damping: 34,
          delay: Math.min(index, 8) * 0.035,
        },
      }}
      className={`card p-4 ${readOnly ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              accent ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary'
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight">
              <Bidi>{entry.product || t(entry.type ?? 'saved')}</Bidi>
            </p>
            {!readOnly && (
              <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                {t('draftBadge')}
              </span>
            )}
          </div>

          {facts.length > 0 && (
            <p className="tnum mt-1 text-[13px] text-muted">{facts.join(' · ')}</p>
          )}

          {entry.comments && (
            <p className="mt-1 line-clamp-2 text-[13px] text-subtle">
              <Bidi>{entry.comments}</Bidi>
            </p>
          )}

          {entry.attachment_ids?.length > 0 && (
            <p className="tnum mt-1 text-[12px] text-subtle">
              {entry.attachment_ids.length} {t('attachments').toLowerCase()}
            </p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onEdit}
            className="btn-outline h-11 min-h-0 flex-1 text-sm"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            {t('editEntry')}
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onDelete}
            aria-label={t('deleteEntry')}
            className="btn h-11 min-h-0 shrink-0 border border-danger/30 bg-danger/10 px-4 text-danger hover:bg-danger/15"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
