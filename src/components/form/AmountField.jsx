import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import CurrencySheet, { CurrencyLabel } from './CurrencyPicker'
import { toLatinDigits } from '@/lib/text'
import { useI18n } from '@/context/I18nContext'

/**
 * Money input: the amount and its currency as one field.
 *
 *   [ 12345              | USD ($) ⌄ ]
 *
 * No ± buttons — unlike a quantity, an amount is read off a receipt and typed,
 * never nudged towards in steps. The currency sits on the trailing edge, where
 * a reader expects the unit, and opens the currency sheet. With a single
 * active currency there is nothing to choose, so it shows as a plain unit.
 */
export default function AmountField({
  id,
  value,
  onChange,
  currencies,
  currencyId,
  onCurrencyChange,
  defaultCurrencyId,
  placeholder = '0.00',
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const currency = currencies.find((c) => c.id === currencyId)
  const canChoose = currencies.length > 1

  return (
    <>
      {/* Ring on the input's focus only: the currency button draws its own,
          and `focus-within` would light both at once. */}
      <div
        className="theme-tint flex items-stretch overflow-hidden rounded-control border border-border-strong bg-surface
                   has-[input:focus]:border-primary has-[input:focus]:ring-2 has-[input:focus]:ring-primary/25"
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            // Fold an Arabic keypad's ٠١٢ and "٫" to ASCII, and accept a comma
            // as the separator, so "١٢,٥" doesn't silently become NaN.
            const raw = toLatinDigits(e.target.value).replace(/,/g, '.')
            if (raw === '' || /^\d*\.?\d*$/.test(raw)) onChange(raw)
          }}
          onFocus={(e) => e.target.select()}
          className="tnum h-tap min-w-0 flex-1 border-0 bg-transparent px-4 text-title font-semibold text-text
                     outline-none placeholder:font-normal placeholder:text-subtle
                     focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {currency &&
          (canChoose ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-label={`${t('currency')}: ${currency.name}`}
              className="flex shrink-0 items-center gap-1.5 border-s border-border bg-surface-2/60 px-3
                         text-body font-semibold text-text transition-colors hover:bg-surface-2 active:bg-surface-2
                         focus-visible:ring-inset focus-visible:ring-offset-0"
            >
              <CurrencyLabel currency={currency} />
              <ChevronDown className="h-4 w-4 text-subtle" aria-hidden />
            </button>
          ) : (
            <span className="flex shrink-0 items-center pe-4 text-body font-semibold text-muted">
              <CurrencyLabel currency={currency} />
            </span>
          ))}
      </div>

      {canChoose && (
        <CurrencySheet
          open={open}
          onClose={() => setOpen(false)}
          currencies={currencies}
          value={currencyId}
          onChange={onCurrencyChange}
          defaultId={defaultCurrencyId}
        />
      )}
    </>
  )
}
