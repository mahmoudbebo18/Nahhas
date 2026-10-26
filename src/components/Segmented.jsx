/**
 * A row of mutually exclusive choices — the timeline's zoom and status
 * filter. Buttons with `aria-pressed` inside a labelled group rather than
 * radios: each press acts at once, and there is no form to submit.
 *
 * The selected segment is a raised surface on the inset track, not a colour
 * fill: green is for the action a screen is about, and these are settings.
 */
export default function Segmented({ label, value, options, onChange, className = '' }) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex min-h-touch items-stretch rounded-control border border-border bg-surface-2 p-0.5 ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-w-[3.25rem] rounded-[8px] px-3 text-secondary font-semibold transition-colors ${
              selected
                ? 'border border-border-strong bg-surface text-text'
                : 'border border-transparent text-muted hover:text-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
