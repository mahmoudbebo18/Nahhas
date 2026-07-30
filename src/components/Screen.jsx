import { motion } from 'framer-motion'
import { useI18n } from '@/context/I18nContext'

/**
 * Page wrapper: sets the max width, the padding, and the enter/exit slide.
 *
 * The slide direction follows the reading direction, so in Arabic screens push
 * in from the left. Distance is small (24px) — a long slide feels sluggish
 * when you are tapping through five levels to reach a sub-task.
 */
export default function Screen({ children, title, lead, className = '', actions }) {
  const { isRtl } = useI18n()
  const dx = isRtl ? -24 : 24

  return (
    <motion.main
      initial={{ opacity: 0, x: dx }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -dx * 0.6 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.7 }}
      className={`mx-auto w-full max-w-2xl px-4 pb-safe pt-4 ${className}`}
    >
      {(title || actions) && (
        <header className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            {title && <h1 className="text-xl font-bold leading-tight">{title}</h1>}
            {lead && <p className="mt-1 text-sm leading-relaxed text-muted">{lead}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </motion.main>
  )
}
