import Bidi from './Bidi'
import CopyButton from './CopyButton'

/**
 * The box every list in the walk is made of — projects, levels, work items,
 * sub-tasks.
 *
 * Built for long Arabic names: the title wraps to three lines and is then
 * clamped, instead of being cut to one line with an ellipsis that hides the
 * part that tells two sub-tasks apart. Facts (code, count, status) sit on one
 * row pinned to the bottom, so across a row of tiles they line up whatever the
 * length of the name above them; the grid stretches every tile in a row to the
 * tallest one.
 *
 * `copyText` adds a small copy button in the corner. It is a sibling of the
 * tile's button, not a child — a button inside a button is invalid HTML and
 * swallows the inner tap on iOS Safari.
 */
export default function Tile({
  title,
  subtitle,
  /** Short facts joined with " · " on the bottom row: code, counts. */
  meta,
  /** Badges after the facts, on the same bottom row. */
  badges,
  /** A <DateRange>, on its own line at the top of the footer. */
  dates,
  /** An icon above the title, for tiles that differ by kind (levels). */
  icon: Icon,
  onClick,
  disabled = false,
  /**
   * Still leads somewhere, but probably not where the engineer is headed. The
   * title steps down to the muted colour rather than the whole tile fading —
   * a faded tile fails contrast and reads as broken.
   */
  dimmed = false,
  copyText,
  copyLabel,
  /** Accessible name when the visible title alone is not enough. */
  label,
}) {
  const facts = (meta ?? []).filter((m) => m !== null && m !== undefined && m !== false && m !== '')
  const hasFooter = facts.length > 0 || badges?.length > 0 || Boolean(dates)

  return (
    <li className="min-w-0">
      <div className={`card relative h-full ${disabled ? 'opacity-45' : 'hover:border-border-strong'}`}>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className="flex h-full w-full flex-col items-start gap-2 rounded-card p-4 text-start
                     transition-colors active:bg-surface-2 disabled:pointer-events-none"
        >
          {Icon && <Icon className="h-5 w-5 shrink-0 text-muted" aria-hidden />}

          <span
            className={`line-clamp-3 w-full break-words text-body font-semibold ${
              copyText ? 'pe-8' : ''
            } ${dimmed ? 'text-muted' : 'text-text'}`}
          >
            <Bidi>{title}</Bidi>
          </span>

          {subtitle && (
            <span className="line-clamp-1 w-full text-secondary text-muted">
              {/* A plain string is one piece of server data. Anything else is
                  already built from isolated parts — wrapped again, the outer
                  isolate would take its direction from the first Latin name
                  and lay a path out backwards. */}
              {typeof subtitle === 'string' ? <Bidi>{subtitle}</Bidi> : subtitle}
            </span>
          )}

          {hasFooter && (
            <span className="mt-auto flex w-full flex-wrap items-center gap-2 pt-2">
              {dates && <span className="flex w-full min-w-0">{dates}</span>}
              {facts.length > 0 && (
                // Each fact isolated on its own, so a Latin code next to an
                // Arabic count keeps the UI's order instead of the code's.
                <span className="tnum min-w-0 text-meta text-muted">
                  {facts.map((fact, i) => (
                    <span key={i}>
                      {i > 0 && ' · '}
                      <Bidi>{fact}</Bidi>
                    </span>
                  ))}
                </span>
              )}
              {badges}
            </span>
          )}
        </button>

        {/* Positioned by its own wrapper: CopyButton keeps `relative` on its
            root for the "copied" pill, which would beat an `absolute` passed
            in and drop the button out of the corner, under the tile. */}
        {copyText && (
          <span className="absolute end-1 top-1">
            <CopyButton value={copyText} label={copyLabel} />
          </span>
        )}
      </div>
    </li>
  )
}

/**
 * The grid the tiles sit in — see `.tile-grid` in index.css for the columns.
 */
export function TileGrid({ children, className = '', ...rest }) {
  return (
    <ul className={`tile-grid ${className}`} {...rest}>
      {children}
    </ul>
  )
}
