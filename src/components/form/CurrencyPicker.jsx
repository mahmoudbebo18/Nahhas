import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import Sheet from '../Sheet'
import SearchField from '../SearchField'
import { useI18n } from '@/context/I18nContext'
import { matches } from '@/lib/text'

/** "USD ($)" — the code always, the symbol only when it adds something. */
export function CurrencyLabel({ currency, symbolClass = 'text-muted' }) {
  const { name, symbol } = currency
  return (
    <span dir="ltr" className="whitespace-nowrap">
      <span>{name}</span>
      {symbol && symbol !== name && <span className={`ms-1 ${symbolClass}`}>({symbol})</span>}
    </span>
  )
}

/**
 * The currency's name in the UI language ("دولار أمريكي", "US Dollar").
 * Odoo only stores an English full name, so the browser's own CLDR data is
 * used instead; an unknown code falls back to nothing rather than the code
 * twice.
 */
function useCurrencyNames() {
  const { lang } = useI18n()
  return useMemo(() => {
    let names = null
    try {
      names = new Intl.DisplayNames([lang], { type: 'currency' })
    } catch {
      /* very old browser — the code alone still identifies it */
    }
    return (code) => {
      const full = names?.of(code)
      return full && full !== code ? full : ''
    }
  }, [lang])
}

/**
 * The currency list behind the amount field's currency button. A bottom
 * sheet, the same pattern as the product picker: every option is a full-width
 * row with the localised name under the code, and a search box appears once
 * the list is long enough to need one.
 */
export default function CurrencySheet({ open, onClose, currencies, value, onChange, defaultId }) {
  const { t } = useI18n()
  const fullName = useCurrencyNames()
  const [search, setSearch] = useState('')

  // Matches the code, the symbol, or the name in the UI language — an
  // engineer looking for the dirham types "درهم", not "AED".
  const filtered = useMemo(() => {
    if (!search.trim()) return currencies
    return currencies.filter((c) =>
      [c.name, c.symbol, fullName(c.name)].some((s) => s && matches(s, search)),
    )
  }, [currencies, search, fullName])

  const close = () => {
    setSearch('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={close} title={t('selectCurrency')}>
      <div className="p-3">
        {currencies.length > 6 && (
          <SearchField value={search} onChange={setSearch} placeholder={t('searchCurrencies')} />
        )}

        {filtered.length === 0 && (
          <p className="py-6 text-center text-secondary text-muted">{t('noCurrencyMatch')}</p>
        )}

        <ul className="space-y-2">
          {filtered.map((c) => {
            const isSelected = c.id === value
            const full = fullName(c.name)
            const isDefault = c.id === defaultId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.id)
                    close()
                  }}
                  aria-pressed={isSelected}
                  className={`flex min-h-tap w-full items-center gap-3 rounded-control border p-3 text-start transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:bg-surface-2 active:bg-surface-2'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      <CurrencyLabel currency={c} />
                    </span>
                    {(full || isDefault) && (
                      <span className="mt-1 block text-secondary text-muted">
                        {full}
                        {full && isDefault && <span aria-hidden> · </span>}
                        {isDefault && t('companyCurrency')}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}
