import { useEffect, useRef } from 'react'
import { Check, Minus } from 'lucide-react'

/**
 * A real <input type="checkbox">, drawn to match the app.
 *
 * The native input is kept (visually hidden, not removed) rather than faked
 * with a div + role: it brings the space-bar toggle, the form semantics and
 * the "3 of 5 selected" announcement for free, and `indeterminate` is a DOM
 * property with no HTML attribute, so the select-all box needs the real
 * element anyway.
 *
 * The whole label is the tap target — 44px tall even when the box itself is
 * 24px, because this is pressed with a thumb on a phone.
 */
export default function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  /** Visible text beside the box. */
  label,
  /** Accessible name when there is no visible label. */
  srLabel,
  className = '',
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked
  }, [indeterminate, checked])

  const filled = checked || indeterminate

  return (
    <label
      className={`inline-flex min-h-tap cursor-pointer select-none items-center gap-2 ${className}`}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        aria-label={srLabel ?? (typeof label === 'string' ? label : undefined)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2
                    transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent
                    peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg ${
                      filled
                        ? 'border-accent bg-accent text-accent-fg'
                        : 'border-border-strong bg-surface text-transparent'
                    }`}
      >
        {checked ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : indeterminate ? (
          <Minus className="h-4 w-4" strokeWidth={3} />
        ) : null}
      </span>
      {label && <span className="text-[13px] font-semibold text-muted">{label}</span>}
    </label>
  )
}
