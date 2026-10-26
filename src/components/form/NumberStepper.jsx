import { Minus, Plus } from 'lucide-react'
import { toLatinDigits } from '@/lib/text'
import { useI18n } from '@/context/I18nContext'

/**
 * Quantity/amount input with ± buttons.
 *
 * "Minimal typing" is the requirement, so the steppers do the work for whole
 * numbers while the middle stays a real numeric input for the odd 12.5 m³.
 * `inputMode="decimal"` gets the numeric keypad without `type="number"`'s
 * scroll-wheel and spinner problems on mobile.
 */
export default function NumberStepper({
  id,
  value,
  onChange,
  step = 1,
  min = 0,
  suffix,
  placeholder = '0',
}) {
  const { t } = useI18n()
  const decreaseLabel = t('decrease')
  const increaseLabel = t('increase')
  const nudge = (delta) => {
    const current = Number(value)
    const base = Number.isNaN(current) || value === '' ? 0 : current
    const next = Math.max(min, Math.round((base + delta) * 1000) / 1000)
    onChange(String(next))
  }

  const btn =
    'flex h-tap w-12 shrink-0 items-center justify-center text-muted transition-colors hover:bg-surface-2 active:bg-surface-2 disabled:opacity-45'

  return (
    <div className="theme-tint flex items-stretch overflow-hidden rounded-control border border-border-strong bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
      <button
        type="button"
        onClick={() => nudge(-step)}
        disabled={Number(value) <= min}
        className={`${btn} border-e border-border`}
        aria-label={decreaseLabel}
      >
        <Minus className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            // Fold an Arabic keypad's ٠١٢ and "٫" to ASCII, and accept a comma
            // as the separator, so "١٢,٥" doesn't silently become NaN — or,
            // worse, get rejected keystroke by keystroke.
            const raw = toLatinDigits(e.target.value).replace(/,/g, '.')
            if (raw === '' || /^\d*\.?\d*$/.test(raw)) onChange(raw)
          }}
          onFocus={(e) => e.target.select()}
          // The wrapper already draws the focus ring around the whole control
          // (`focus-within` above), so the global :focus-visible ring would
          // land a second, boxier one inside it. Cancel it here only — focus
          // stays just as visible, on the element that reads as the field.
          className="tnum h-tap w-full min-w-0 border-0 bg-transparent px-2 text-center text-title
                     font-semibold text-text outline-none placeholder:text-subtle
                     focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {suffix && (
          <span className="pe-3 text-secondary font-medium text-muted" aria-hidden>
            {suffix}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => nudge(step)}
        className={`${btn} border-s border-border`}
        aria-label={increaseLabel}
      >
        <Plus className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
