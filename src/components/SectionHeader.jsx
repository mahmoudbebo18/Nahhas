/**
 * A heading over a group of tiles or cards: the name, how many there are, and
 * room at the end for one action (select all, expand…).
 *
 * `as` lets a screen keep its heading levels honest — a group inside a
 * section is an h3, not a second h2.
 */
export default function SectionHeader({ id, title, count, action, as: Heading = 'h2', className = '' }) {
  return (
    <div className={`mb-3 flex min-h-touch items-center gap-3 ${className}`}>
      <Heading id={id} className="flex min-w-0 flex-1 items-baseline gap-2 text-body font-semibold">
        <span className="truncate">{title}</span>
        {count != null && <span className="tnum shrink-0 text-secondary font-medium text-muted">{count}</span>}
      </Heading>
      {action}
    </div>
  )
}
