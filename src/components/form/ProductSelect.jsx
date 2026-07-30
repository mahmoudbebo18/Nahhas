import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, PackageSearch, Search } from 'lucide-react'
import Sheet from '../Sheet'
import { EmptyState, ErrorState, ListSkeleton } from '../states'
import { useI18n } from '@/context/I18nContext'
import { bidi, formatNumber, matches } from '@/lib/text'

/**
 * Product picker for the four entry forms.
 *
 * A native <select> is unusable here: product names are long, bilingual, and
 * there can be dozens. This is a searchable bottom sheet — the search box only
 * appears once the list is long enough to need it, so the common case (three
 * products on a sub-task) is still a single tap.
 */
export default function ProductSelect({ products, value, onChange, query, id }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = products.find((p) => p.line_id === value?.line_id) ?? value ?? null

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    return products.filter((p) => matches(p.name, search))
  }, [products, search])

  const showSearch = products.length > 6

  return (
    <>
      <motion.button
        type="button"
        id={id}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          setSearch('')
          setOpen(true)
        }}
        disabled={query?.isPending || products.length === 0}
        className="input flex items-center gap-3 py-3 text-start disabled:opacity-60"
      >
        <span className="min-w-0 flex-1">
          {selected ? (
            <>
              <span className="block truncate font-medium" {...bidi(selected.name)}>
                {selected.name}
              </span>
              {(selected.quantity || selected.uom) && (
                <span className="mt-0.5 block text-[13px] text-muted">
                  {t('plannedQty')}: <span className="tnum">{formatNumber(selected.quantity)}</span>
                  {selected.uom ? ` ${selected.uom}` : ''}
                </span>
              )}
            </>
          ) : (
            <span className="text-subtle">
              {query?.isPending ? t('loading') : t('selectProduct')}
            </span>
          )}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-subtle" aria-hidden />
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('selectProduct')}>
        {showSearch && (
          <div className="sticky top-0 z-10 border-b border-border bg-surface p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-subtle"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchProducts')}
                className="input ps-9"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <div className="p-3">
          {query?.isPending && <ListSkeleton rows={4} />}

          {query?.isError && <ErrorState error={query.error} onRetry={query.refetch} compact />}

          {!query?.isPending && !query?.isError && filtered.length === 0 && (
            <EmptyState
              icon={PackageSearch}
              title={search ? t('searchProducts') : t('emptyProducts')}
              body={search ? undefined : t('emptyProductsHint')}
            />
          )}

          <ul className="space-y-2">
            {filtered.map((p) => {
              const isSelected = p.line_id === selected?.line_id
              return (
                <li key={p.line_id}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.985 }}
                    onClick={() => {
                      onChange(p)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent-soft'
                        : 'border-border bg-surface active:bg-surface-2'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-medium leading-snug" {...bidi(p.name)}>
                        {p.name}
                      </span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {t('plannedQty')}: <span className="tnum">{formatNumber(p.quantity)}</span>
                        {p.uom ? ` ${p.uom}` : ''}
                      </span>
                    </span>
                    {isSelected && <Check className="h-5 w-5 shrink-0 text-accent" aria-hidden />}
                  </motion.button>
                </li>
              )
            })}
          </ul>
        </div>
      </Sheet>
    </>
  )
}
