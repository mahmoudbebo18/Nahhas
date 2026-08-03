import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { toLatinDigits } from '@/lib/text'

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
  const nudge = (delta) => {
    const current = Number(value)
    const base = Number.isNaN(current) || value === '' ? 0 : current
    const next = Math.max(min, Math.round((base + delta) * 1000) / 1000)
    onChange(String(next))
  }

  const btn =
    'flex h-tap w-12 shrink-0 items-center justify-center text-muted transition-colors active:bg-surface-2 disabled:opacity-35'

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => nudge(-step)}
        disabled={Number(value) <= min}
        className={`${btn} border-e border-border`}
        aria-label="Decrease"
      >
        <Minus className="h-5 w-5" aria-hidden />
      </motion.button>

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
          className="tnum w-full min-w-0 border-0 bg-transparent px-2 text-center text-lg font-semibold text-text outline-none placeholder:text-subtle"
        />
        {suffix && (
          <span className="pe-3 text-sm font-medium text-muted" aria-hidden>
            {suffix}
          </span>
        )}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => nudge(step)}
        className={`${btn} border-s border-border`}
        aria-label="Increase"
      >
        <Plus className="h-5 w-5" aria-hidden />
      </motion.button>
    </div>
  )
}
