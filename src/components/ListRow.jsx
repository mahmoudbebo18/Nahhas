import { ChevronRight } from 'lucide-react'
import Bidi from './Bidi'
import CopyButton from './CopyButton'

/**
 * A full-width drill-down row — for the legacy task tree, where the order is
 * hierarchical and a grid of boxes would hide which node is inside which.
 * Everything that is a flat list in the walk uses <Tile> instead.
 *
 * The chevron uses `rtl-flip` so it points the way the flow actually goes in
 * Arabic. `copyText` adds a second, smaller target at the end of the row; it
 * is a sibling of the drill-down button, not a child — a button inside a
 * button is invalid HTML and swallows the inner tap on iOS Safari.
 */
export default function ListRow({
  title,
  subtitle,
  meta,
  badges,
  leading,
  onClick,
  disabled = false,
  /** Still leads somewhere, but probably not where the engineer is headed. */
  dimmed = false,
  /** Text the row's copy button puts on the clipboard — omit for no button. */
  copyText,
  copyLabel,
}) {
  return (
    <div
      className={`card flex w-full items-center ${
        disabled ? 'opacity-45' : 'hover:border-border-strong'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex min-h-[4.5rem] min-w-0 flex-1 items-center gap-3 rounded-card p-4 text-start
                   transition-colors active:bg-surface-2 disabled:pointer-events-none"
      >
        {leading && <div className="shrink-0">{leading}</div>}

        <div className="min-w-0 flex-1">
          <p className={`line-clamp-2 break-words font-semibold ${dimmed ? 'text-muted' : 'text-text'}`}>
            <Bidi>{title}</Bidi>
          </p>

          {subtitle && (
            <p className="mt-1 truncate text-secondary text-muted">
              <Bidi>{subtitle}</Bidi>
            </p>
          )}

          {badges?.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>

        {meta && <div className="tnum shrink-0 text-end text-secondary text-muted">{meta}</div>}

        <ChevronRight className="rtl-flip h-5 w-5 shrink-0 text-subtle" aria-hidden />
      </button>

      {copyText && (
        <span className="flex shrink-0 items-center self-stretch border-s border-border px-1">
          <CopyButton value={copyText} label={copyLabel} />
        </span>
      )}
    </div>
  )
}
