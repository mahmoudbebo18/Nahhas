import { useId } from 'react'
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * A group whose body folds away under its heading.
 *
 * Header and body are one bordered box: a filled header bar — the
 * conventional accordion header, so it reads as something to press — and,
 * when open, the body inside the same frame under a divider, so what is in a
 * group is visibly in it. Shut, only the bar remains. The whole bar is the
 * toggle, so the target is as wide as the screen.
 *
 * `leading` is for a control that must NOT toggle — the group's select-all
 * checkbox — and sits beside the button rather than inside it, since a
 * checkbox nested in a button is two controls fighting over one tap.
 *
 * The body is hidden, not unmounted, so `aria-controls` always points at
 * something, and it opens instantly: this is a list, and lists in this app
 * appear rather than animate in. Only the chevron turns.
 *
 * `size="section"` is a screen-level heading (h2 weight); the default is a
 * group inside one.
 */
export default function Collapsible({
  open,
  onToggle,
  title,
  subtitle,
  count,
  leading,
  as: Heading = 'h3',
  size = 'group',
  className = '',
  children,
}) {
  const panelId = useId()

  return (
    <section className={`theme-tint overflow-hidden rounded-card border border-border bg-surface ${className}`}>
      <div
        className={`flex items-stretch bg-surface-2 transition-colors
                    has-[button:hover]:bg-border/50 has-[button:active]:bg-border/50
                    ${open ? 'border-b border-border' : ''} ${leading ? 'ps-1' : ''}`}
      >
        {leading && <div className="flex shrink-0 items-center">{leading}</div>}
        <Heading className="flex min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            className={`flex w-full items-center gap-3 text-start
                        focus-visible:ring-inset focus-visible:ring-offset-0
                        ${leading ? 'pe-3 ps-1' : 'px-3'}
                        ${size === 'section' ? 'min-h-[3.25rem] py-2' : 'min-h-touch py-1.5'}`}
          >
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate font-semibold ${size === 'section' ? 'text-body' : 'text-secondary'}`}
              >
                {title}
              </span>
              {subtitle && <span className="block truncate text-meta text-muted">{subtitle}</span>}
            </span>
            {count != null && (
              <span className="tnum shrink-0 text-secondary font-medium text-muted">{count}</span>
            )}
            {/* Down when open; pointing along the reading direction when shut. */}
            <ChevronDown
              className={`h-5 w-5 shrink-0 text-muted transition-transform motion-reduce:transition-none ${
                open ? '' : '-rotate-90 rtl:rotate-90'
              }`}
              aria-hidden
            />
          </button>
        </Heading>
      </div>

      <div id={panelId} hidden={!open} className="p-3">
        {children}
      </div>
    </section>
  )
}

/**
 * "Expand all" / "Collapse all" for a screen of groups. Collapses when every
 * group is open, otherwise expands — one button, whose label always says what
 * pressing it will do.
 */
export function ExpandAllButton({ allOpen, onChange }) {
  const { t } = useI18n()
  const Icon = allOpen ? ChevronsDownUp : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={() => onChange(!allOpen)}
      className="btn-outline min-h-touch px-3 text-secondary"
    >
      <Icon className="h-4 w-4 text-muted" aria-hidden />
      {allOpen ? t('collapseAll') : t('expandAll')}
    </button>
  )
}
