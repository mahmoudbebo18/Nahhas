import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { PackageSearch } from 'lucide-react'
import Screen from '@/components/Screen'
import Field from '@/components/form/Field'
import ProductSelect from '@/components/form/ProductSelect'
import NumberStepper from '@/components/form/NumberStepper'
import { DateField, DateTimeField } from '@/components/form/DateTimeField'
import AttachmentPicker from '@/components/form/AttachmentPicker'
import AmountField from '@/components/form/AmountField'
import SubmitBar from '@/components/form/SubmitBar'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import SuccessSheet from './SuccessSheet'
import { ENTRY_TYPES, isEntryType } from '@/api/entryTypes'
import {
  useCreateEntry,
  useCurrencies,
  useMyEntries,
  useProducts,
  useUpdateEntry,
} from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useTrail } from '@/context/TrailContext'
import { useToast } from '@/components/Toast'
import {
  formatDuration,
  fromApiDateTime,
  minutesBetween,
  nowRounded,
  todayISO,
  toApiDateTime,
} from '@/lib/datetime'
import Bidi from '@/components/Bidi'
import { KEYS, readStored, writeStored } from '@/lib/storage'

/**
 * One screen for all four entry types.
 *
 * They share ~80% of their shape (product from the same endpoint, comments,
 * a sticky submit, the same success flow), so the differences live in small
 * conditional blocks rather than four near-identical files that would drift.
 *
 *   material      → product, qty, uom (from product), comments, date
 *   expense       → product, amount, currency, comments, date, attachments
 *   equipment     → product, start, end, comments, attachments
 *   subcontractor → product, start, end, qty, comments, attachments
 */

const blankFor = (type) => ({
  product: null,
  qty: type === 'subcontractor' ? '1' : '',
  amount: '',
  currencyId: null, // null → resolved below from last-used / company default
  comments: '',
  date: todayISO(),
  start: nowRounded(),
  end: '',
  attachments: [],
})

export default function EntryFormScreen() {
  const params = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { trail } = useTrail()
  const toast = useToast()

  // The same screen serves two routes: /subtasks/:taskId/:type creates a new
  // draft, /entries/:lineId/edit corrects one that is already in the basket.
  // In edit mode the task and the type come from the entry, not the URL.
  const editingId = params.lineId ? Number(params.lineId) : null
  const basket = useMyEntries('draft')
  const editing = editingId
    ? (basket.data?.drafts ?? []).find((d) => d.line_id === editingId)
    : null

  const taskId = editingId ? editing?.task_id : params.taskId
  const type = editingId ? editing?.type : params.type

  const [form, setForm] = useState(() => blankFor(type))
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)

  const productsQuery = useProducts(taskId, type)
  const create = useCreateEntry(taskId, type)
  const update = useUpdateEntry()
  const pending = editingId ? update.isPending : create.isPending
  const writeError = editingId ? update.error : create.error
  const writeFailed = editingId ? update.isError : create.isError

  const products = productsQuery.data?.products ?? []
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const currenciesQuery = useCurrencies(type === 'expense')
  const currencies = currenciesQuery.data?.currencies ?? []
  // The engineer's pick, else the currency their last expense used, else the
  // company's — whichever is still active. Null until the list loads, in which
  // case nothing is sent and the server applies the company currency itself.
  const activeIds = currencies.map((c) => c.id)
  const currencyId =
    [form.currencyId, Number(readStored(KEYS.lastCurrency)), currenciesQuery.data?.default_id].find(
      (id) => activeIds.includes(id),
    ) ?? null
  const rememberCurrency = () => {
    if (type === 'expense' && currencyId) writeStored(KEYS.lastCurrency, String(currencyId))
  }

  // Fill the form once, when the draft arrives. Keyed on the entry id alone:
  // a background re-fetch of the basket must never overwrite what the
  // engineer has already retyped into the fields.
  useEffect(() => {
    if (!editing) return
    setForm({
      // The product list may not have loaded yet. Seed from the entry itself
      // so the field is never blank, then upgrade below once it does.
      product: editing.product_id
        ? {
            product_id: editing.product_id,
            line_id: editing.line_id,
            name: editing.product,
            uom_id: editing.uom_id,
            uom: editing.uom,
            quantity: editing.qty,
          }
        : null,
      qty: editing.qty ? String(editing.qty) : '',
      amount: editing.amount ? String(editing.amount) : '',
      currencyId: editing.currency_id || null,
      comments: editing.comments || '',
      date: editing.date || todayISO(),
      start: fromApiDateTime(editing.start) || nowRounded(),
      end: fromApiDateTime(editing.end) || '',
      attachments: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.line_id])

  // Swap the seeded stub for the real product line once the list arrives, so
  // the picker shows it as selected and the planned quantity appears. Only
  // ever touches `product`, and only while it is still the stub.
  useEffect(() => {
    if (!editingId || products.length === 0) return
    setForm((f) => {
      if (!f.product || f.product.line_id !== editing?.line_id) return f
      const match = products.find((p) => p.product_id === f.product.product_id)
      return match ? { ...f, product: match } : f
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, products.length, editing?.line_id])

  const config = ENTRY_TYPES[type]
  const needsTimes = type === 'equipment' || type === 'subcontractor'
  const needsQty = type === 'material' || type === 'subcontractor'

  const durationPreview = useMemo(() => {
    if (!needsTimes) return null
    const minutes = minutesBetween(form.start, form.end)
    return minutes === null ? null : formatDuration(minutes, lang)
  }, [needsTimes, form.start, form.end, lang])

  // In edit mode the type is only known once the basket has loaded, so the
  // usual "unknown type → bounce" guard has to wait for it.
  if (editingId) {
    if (basket.isPending) {
      return (
        <Screen width="narrow">
          <ListSkeleton rows={3} />
        </Screen>
      )
    }
    if (basket.isError) {
      return (
        <Screen width="narrow" title={t('editEntry')}>
          <ErrorState error={basket.error} onRetry={basket.refetch} />
        </Screen>
      )
    }
    // Confirmed, deleted, or someone else's — either way it is no longer a
    // draft this engineer can correct.
    if (!editing) return <Navigate to="/entries" replace />
  }

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
        // When correcting a draft, only send it if it actually changed: an
        // entry whose currency has since been deactivated must keep it rather
        // than be silently moved to whatever the picker fell back to.
        ...(currencyId && (!editing || currencyId !== editing.currency_id)
          ? { currency_id: currencyId }
          : {}),
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

    if (editingId) {
      // Correcting a draft returns to the basket rather than the success
      // sheet — there is nothing to celebrate, the entry has not moved.
      update.mutate(
        { lineId: editingId, ...buildPayload() },
        {
          onSuccess: () => {
            rememberCurrency()
            toast.success(t('saved'))
            navigate('/entries')
          },
        },
      )
      return
    }

    create.mutate(buildPayload(), {
      onSuccess: (data) => {
        rememberCurrency()
        setResult(data)
        toast.success(t('savedDraft'))
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

  // String-compared: the route param is a string, the trail holds a number.
  // In edit mode the entry names its own sub-task; otherwise the trail does.
  const subtaskName = editing
    ? editing.task
    : String(trail.subtask?.taskId ?? '') === String(taskId)
      ? trail.subtask.name
      : null

  return (
    <Screen
      width="narrow"
      title={editingId ? `${t('editEntry')} · ${t(type)}` : t(type)}
      meta={subtaskName ? <Bidi>{subtaskName}</Bidi> : undefined}
    >

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
              className="btn-outline"
            >
              {t('pickAnother')}
            </button>
          }
        />
      )}

      {productsQuery.isSuccess && products.length > 0 && (
        <form onSubmit={submit} className="space-y-6">
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
                <AmountField
                  id={id}
                  value={form.amount}
                  onChange={(amount) => set({ amount })}
                  currencies={currencies}
                  currencyId={currencyId}
                  onCurrencyChange={(id) => set({ currencyId: id })}
                  defaultCurrencyId={currenciesQuery.data?.default_id}
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
                <p className="-mt-2 flex flex-wrap items-center gap-x-2 rounded-control bg-surface-2 px-3 py-2 text-secondary text-muted">
                  <span className="font-semibold text-text">{t('duration')}</span>
                  <span className="tnum">{durationPreview}</span>
                  <span aria-hidden>·</span>
                  <span>{t('durationNote')}</span>
                </p>
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

          {writeFailed && <ErrorState error={writeError} onRetry={submit} compact />}

          <SubmitBar
            onSubmit={submit}
            pending={pending}
            label={editingId ? t('saveChanges') : undefined}
          />
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
