import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Camera, ClipboardList, Loader2, Paperclip, Plus } from 'lucide-react'
import Sheet from '@/components/Sheet'
import AttachmentPicker from '@/components/form/AttachmentPicker'
import { useToast } from '@/components/Toast'
import { useUploadPhoto } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { formatDate, formatDurationHours } from '@/lib/datetime'
import Bidi from '@/components/Bidi'
import { formatNumber } from '@/lib/text'

/**
 * Post-write confirmation.
 *
 * The primary action deliberately goes back to the action chooser for the
 * SAME sub-task, not to the project list: an engineer standing at one wall
 * logs material, then plant hours, then a photo, and sending them back to the
 * top would mean re-walking four levels between each one.
 *
 * It also exposes the one thing only a saved entry can do — POST /photo with
 * `line_id`, appending a photo to the line that was just created.
 */
export default function SuccessSheet({ open, result, taskId, entryType, onAddAnother, onDone }) {
  const { t, lang } = useI18n()
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const toast = useToast()
  const upload = useUploadPhoto(taskId)
  const [pending, setPending] = useState([])
  const [attached, setAttached] = useState(0)

  const lineId = result?.line_id

  const rows = [
    result?.product && { label: t('product'), value: result.product },
    result?.qty != null && {
      label: t('quantity'),
      value: `${formatNumber(result.qty, lang)}${result.uom ? ` ${result.uom}` : ''}`,
    },
    result?.amount != null && {
      label: t('amount'),
      value: `${formatNumber(result.amount, lang)}${result.currency ? ` ${result.currency}` : ''}`,
    },
    // Duration is computed server-side — this is the authoritative value.
    result?.duration != null &&
      result.duration !== false && {
        label: t('duration'),
        value: formatDurationHours(result.duration, lang),
      },
    result?.date && { label: t('date'), value: formatDate(result.date, lang) },
    result?.partner && { label: t('subcontractor'), value: result.partner },
  ].filter(Boolean)

  const attachmentCount = (result?.attachment_ids?.length ?? 0) + attached

  async function uploadPending() {
    if (pending.length === 0) return
    const queued = pending
    setPending([])
    let ok = 0
    for (const attachment of queued) {
      try {
        await upload.mutateAsync({ attachment, lineId })
        ok += 1
      } catch (err) {
        toast.error(err.message)
      }
    }
    if (ok) {
      setAttached((n) => n + ok)
      toast.success(t('savedPhoto'))
    }
  }

  return (
    <Sheet open={open} onClose={onDone} title={t('saved')}>
      <div className="p-4">
        {/* The one celebratory motion in the app: it marks the save landing. */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success"
        >
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </motion.div>

        <p className="text-center text-title font-bold">
          {t(`saved${entryType.charAt(0).toUpperCase()}${entryType.slice(1)}`, t('saved'))}
        </p>
        {/* The entry is a draft: it is on the server but the office cannot see
            it yet. Saying so here is what stops an engineer walking off site
            believing the day's work is filed. */}
        <p className="mx-auto mt-1 max-w-xs text-center text-secondary text-muted">
          {t('savedDraftHint')}
        </p>
        {lineId && (
          <p className="tnum mt-1 text-center text-meta text-muted">
            {/* `<bdi>` keeps the "#" glued to its number: in an Arabic line
                the bare "#" is a neutral between RTL text and a digit run,
                and lands on the wrong side of the id. */}
            {t('lineRef')} <bdi>#{lineId}</bdi>
          </p>
        )}

        {rows.length > 0 && (
          <dl className="mt-4 divide-y divide-border overflow-hidden rounded-card border border-border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start gap-3 px-4 py-3">
                <dt className="w-28 shrink-0 text-secondary font-medium text-muted">{row.label}</dt>
                <dd className="tnum min-w-0 flex-1 break-words text-secondary font-semibold">
                  <Bidi>{row.value}</Bidi>
                </dd>
              </div>
            ))}
          </dl>
        )}

        {attachmentCount > 0 && (
          <p className="tnum mt-3 flex items-center justify-center gap-2 text-secondary text-muted">
            <Paperclip className="h-4 w-4" aria-hidden />
            {attachmentCount} {t('attachments').toLowerCase()}
          </p>
        )}

        {/* POST /subtasks/<task_id>/photo with line_id — appends to this line. */}
        {lineId && (
          <div className="mt-4 rounded-card border border-dashed border-border-strong p-3">
            <p className="mb-2 flex items-center gap-2 text-secondary font-semibold text-muted">
              <Camera className="h-4 w-4" aria-hidden />
              {t('attachments')}
            </p>
            <AttachmentPicker attachments={pending} onChange={setPending} max={4} />
            {pending.length > 0 && (
              <button
                type="button"
                onClick={uploadPending}
                disabled={upload.isPending}
                className="btn-outline mt-3 w-full"
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    {t('uploading')}
                  </>
                ) : (
                  `${t('submit')} (${pending.length})`
                )}
              </button>
            )}
          </div>
        )}

        <div className="mt-6 space-y-2">
          <button type="button" onClick={onDone} className="btn-primary w-full">
            {t('logSomethingElse')}
          </button>
          <button type="button" onClick={onAddAnother} className="btn-ghost w-full">
            <Plus className="h-5 w-5" aria-hidden />
            {t('addAnother')}
          </button>
          <button
            type="button"
            onClick={() => {
              onDone()
              navigate('/entries')
            }}
            className="btn-ghost w-full"
          >
            <ClipboardList className="h-5 w-5" aria-hidden />
            {t('reviewNow')}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
