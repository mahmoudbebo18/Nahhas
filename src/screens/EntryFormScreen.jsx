import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PackageSearch } from 'lucide-react'
import Screen from '@/components/Screen'
import Field from '@/components/form/Field'
import ProductSelect from '@/components/form/ProductSelect'
import NumberStepper from '@/components/form/NumberStepper'
import { DateField, DateTimeField } from '@/components/form/DateTimeField'
import AttachmentPicker from '@/components/form/AttachmentPicker'
import SubmitBar from '@/components/form/SubmitBar'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import SuccessSheet from './SuccessSheet'
import { ENTRY_TYPES, isEntryType } from '@/api/entryTypes'
import { useCreateEntry, useProducts } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useTrail } from '@/context/TrailContext'
import { useToast } from '@/components/Toast'
import { formatDuration, minutesBetween, nowRounded, todayISO, toApiDateTime } from '@/lib/datetime'
import { bidi } from '@/lib/text'

/**
 * One screen for all four entry types.
 *
 * They share ~80% of their shape (product from the same endpoint, comments,
 * a sticky submit, the same success flow), so the differences live in small
 * conditional blocks rather than four near-identical files that would drift.
 *
 *   material      → product, qty, uom (from product), comments, date
 *   expense       → product, amount, comments, date, attachments
 *   equipment     → product, start, end, comments, attachments
 *   subcontractor → product, start, end, qty, comments, attachments
 */

const blankFor = (type) => ({
  product: null,
  qty: type === 'subcontractor' ? '1' : '',
  amount: '',
  comments: '',
  date: todayISO(),
  start: nowRounded(),
  end: '',
  attachments: [],
})

export default function EntryFormScreen() {
  const { taskId, type } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { trail } = useTrail()
  const toast = useToast()

  const [form, setForm] = useState(() => blankFor(type))
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)

  const productsQuery = useProducts(taskId, type)
  const create = useCreateEntry(taskId, type)

  const products = productsQuery.data?.products ?? []
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const config = ENTRY_TYPES[type]
  const needsTimes = type === 'equipment' || type === 'subcontractor'
  const needsQty = type === 'material' || type === 'subcontractor'

  const durationPreview = useMemo(() => {
    if (!needsTimes) return null
    const minutes = minutesBetween(form.start, form.end)
    return minutes === null ? null : formatDuration(minutes, lang)
  }, [needsTimes, form.start, form.end, lang])

  if (!isEntryType(type)) return <Navigate to={`/subtasks/${taskId}`} replace />

  function validate() {
    const next = {}
    if (!form.product) next.product = t('errProduct')

    if (needsQty && !(Number(form.qty) > 0)) next.qty = t('errQty')
    if (type === 'expense' && !(Number(form.amount) > 0)) next.amount = t('errAmount')

    if (type === 'material' || type === 'expense') {
      if (!form.date) next.date = t('errDate')
    }

    if (needsTimes) {
      if (!form.start) next.start = t('errStart')
      if (!form.end) next.end = t('errEnd')
      else if (form.start && minutesBetween(form.start, form.end) <= 0) {
        next.end = t('errEndBeforeStart')
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** Shape the body exactly as the contract defines it, per type. */
  function buildPayload() {
    const base = { product_id: form.product.product_id }
    const comments = form.comments.trim()
    if (comments) base.comments = comments

    if (type === 'material') {
      return {
        ...base,
        qty: Number(form.qty),
        // The UoM comes from the product line; there is no UoM list endpoint
        // to offer alternatives, so we echo the product's own unit.
        uom_id: form.product.uom_id,
        date: form.date,
      }
    }

    if (type === 'expense') {
      return {
        ...base,
        amount: Number(form.amount),
        date: form.date,
        attachments: form.attachments,
      }
    }

    if (type === 'equipment') {
      // `duration` is computed server-side — deliberately not sent.
      return {
        ...base,
        start: toApiDateTime(form.start),
        end: toApiDateTime(form.end),
        attachments: form.attachments,
      }
    }

    return {
      ...base,
      start: toApiDateTime(form.start),
      end: toApiDateTime(form.end),
      qty: Number(form.qty),
      // Optional in the contract, and there is no partner picker yet.
      partner_id: null,
      attachments: form.attachments,
    }
  }

  function submit(e) {
    e?.preventDefault()
    if (!validate()) return

    create.mutate(buildPayload(), {
      onSuccess: (data) => {
        setResult(data)
        toast.success(t('saved'))
      },
      // The error is rendered inline above the submit bar with a retry, so no
      // toast here — a failed write needs a decision, not a disappearing note.
    })
  }

  function addAnother() {
    setResult(null)
    // Keep the product selected: the next line at the same spot is usually
    // the same material with a different quantity.
    setForm((f) => ({ ...blankFor(type), product: f.product, date: f.date }))
    setErrors({})
    create.reset()
  }

  const subtaskName = trail.subtask?.taskId === taskId ? trail.subtask.name : null
  const Icon = config.icon
  const accentTile = config.tone === 'accent'

  return (
    <Screen>
      <header className="mb-5 flex items-start gap-3">
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            accentTile ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary'
          }`}
        >
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{t(type)}</h1>
          {subtaskName && (
            <p className="mt-0.5 truncate text-sm text-muted" {...bidi(subtaskName)}>
              {subtaskName}
            </p>
          )}
        </div>
      </header>

      {productsQuery.isPending && <ListSkeleton rows={3} />}

      {productsQuery.isError && (
        <ErrorState error={productsQuery.error} onRetry={productsQuery.refetch} />
      )}

      {productsQuery.isSuccess && products.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title={t('emptyProducts')}
          body={t('emptyProductsHint')}
          action={
            <button
              type="button"
              onClick={() => navigate(`/subtasks/${taskId}`)}
              className="btn-outline mt-1"
            >
              {t('pickAnother')}
            </button>
          }
        />
      )}

      {productsQuery.isSuccess && products.length > 0 && (
        <form onSubmit={submit} className="space-y-5">
          <Field label={t('product')} error={errors.product}>
            {(id) => (
              <ProductSelect
                id={id}
                products={products}
                value={form.product}
                query={productsQuery}
                onChange={(product) => {
                  set({ product })
                  setErrors((e) => ({ ...e, product: undefined }))
                }}
              />
            )}
          </Field>

          {needsQty && (
            <Field
              label={t('quantity')}
              error={errors.qty}
              hint={form.product?.uom ? `${t('uom')}: ${form.product.uom}` : undefined}
            >
              {(id) => (
                <NumberStepper
                  id={id}
                  value={form.qty}
                  onChange={(qty) => set({ qty })}
                  suffix={form.product?.uom}
                />
              )}
            </Field>
          )}

          {type === 'expense' && (
            <Field label={t('amount')} error={errors.amount}>
              {(id) => (
                <NumberStepper
                  id={id}
                  value={form.amount}
                  onChange={(amount) => set({ amount })}
                  step={50}
                  placeholder="0.00"
                />
              )}
            </Field>
          )}

          {needsTimes && (
            <>
              <Field label={t('start')} error={errors.start}>
                {(id) => (
                  <DateTimeField id={id} value={form.start} onChange={(start) => set({ start })} />
                )}
              </Field>

              <Field label={t('end')} error={errors.end}>
                {(id) => (
                  <DateTimeField
                    id={id}
                    value={form.end}
                    min={form.start}
                    onChange={(end) => set({ end })}
                  />
                )}
              </Field>

              {durationPreview && !errors.end && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="-mt-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted"
                >
                  <span className="font-semibold text-text">{t('duration')}</span>
                  <span className="tnum">{durationPreview}</span>
                  <span className="text-subtle">·</span>
                  <span className="text-subtle">calculated by Odoo on save</span>
                </motion.p>
              )}
            </>
          )}

          {(type === 'material' || type === 'expense') && (
            <Field label={t('date')} error={errors.date}>
              {(id) => <DateField id={id} value={form.date} onChange={(date) => set({ date })} />}
            </Field>
          )}

          <Field label={t('comments')} optional>
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={form.comments}
                onChange={(e) => set({ comments: e.target.value })}
                placeholder={t('commentsPlaceholder')}
                className="input"
              />
            )}
          </Field>

          {config.supportsAttachments && (
            <Field label={t('attachments')} optional>
              <AttachmentPicker
                attachments={form.attachments}
                onChange={(attachments) => set({ attachments })}
              />
            </Field>
          )}

          {create.isError && <ErrorState error={create.error} onRetry={submit} compact />}

          <SubmitBar onSubmit={submit} pending={create.isPending} />
        </form>
      )}

      <SuccessSheet
        open={Boolean(result)}
        result={result}
        taskId={taskId}
        entryType={type}
        onAddAnother={addAnother}
        onDone={() => {
          setResult(null)
          navigate(`/subtasks/${taskId}`)
        }}
      />
    </Screen>
  )
}
