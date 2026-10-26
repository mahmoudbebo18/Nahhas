import { motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '@/context/I18nContext'
import { useScrollMemory } from '@/hooks/useScrollMemory'

/**
 * Page wrapper: width, padding, the screen title, and the change of screen.
 *
 * The screen change is one of the few places motion earns its keep — it says
 * "you went deeper" or "you came back". So it is short, a tween rather than a
 * spring, and only a fade when the OS asks for reduced motion. The slide
 * follows the reading direction: in Arabic, screens come in from the left.
 *
 * `count` sits in brackets right after the title — "الدور (12 بند)" — lighter
 * and smaller, so the title still reads first without spending a line on it.
 *
 * `meta` is a line of facts under the title (a project code). There is no
 * instruction line — "Choose a project" above a list of projects tells the
 * engineer nothing they can't see.
 *
 * `width`: 'wide' for tile grids, 'narrow' for forms and reading — a form
 * field stretched across a desktop monitor is hard to scan.
 */
const WIDTHS = { wide: 'max-w-5xl', narrow: 'max-w-xl', compact: 'max-w-sm' }

export const SCREEN_WIDTH = WIDTHS.wide

export default function Screen({
  children,
  title,
  count,
  meta,
  className = '',
  actions,
  width = 'wide',
}) {
  const { isRtl } = useI18n()
  const reduce = useReducedMotion()
  useScrollMemory()
  const dx = isRtl ? -12 : 12

  const motionProps = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, x: dx },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -dx / 2 },
        transition: { duration: 0.18, ease: [0.2, 0, 0, 1] },
      }

  return (
    <motion.main
      {...motionProps}
      className={`mx-auto w-full ${WIDTHS[width] ?? WIDTHS.wide} px-4 pb-safe pt-6 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-6 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="break-words text-display font-bold">
                {title}
                {count && (
                  <span className="tnum ms-2 whitespace-nowrap text-title font-medium text-muted">
                    ({count})
                  </span>
                )}
              </h1>
            )}
            {meta && <div className="mt-1 text-secondary text-muted">{meta}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </motion.main>
  )
}
