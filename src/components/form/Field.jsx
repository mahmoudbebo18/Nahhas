import { useId } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * Label + control + inline error. Errors animate in under the field they
 * belong to rather than collecting in a summary at the top — on a phone the
 * summary scrolls out of view before you reach the offending input.
 */
export default function Field({ label, error, hint, optional = false, children, htmlFor }) {
  const { t } = useI18n()
  const generatedId = useId()
  const id = htmlFor ?? generatedId

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {optional && <span className="ms-1.5 font-medium normal-case text-subtle">({t('optional')})</span>}
      </label>

      {typeof children === 'function' ? children(id) : children}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 overflow-hidden text-[13px] font-medium text-danger"
            role="alert"
          >
            <AlertCircle className="mt-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="mt-1.5">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>

      {hint && !error && <p className="mt-1.5 text-[13px] text-subtle">{hint}</p>}
    </div>
  )
}
