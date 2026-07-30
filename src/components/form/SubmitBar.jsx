import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * Sticky submit bar.
 *
 * Pinned to the bottom of the viewport so the primary action is always under
 * the thumb — a form with a date picker and three photos is taller than the
 * screen, and hunting for a save button at the end of it is exactly the kind
 * of friction this portal exists to remove.
 */
export default function SubmitBar({ onSubmit, pending, disabled, label }) {
  const { t } = useI18n()

  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-bg/90 px-4 py-3 pb-safe backdrop-blur">
      <motion.button
        type="submit"
        whileTap={pending || disabled ? undefined : { scale: 0.98 }}
        onClick={onSubmit}
        disabled={pending || disabled}
        className="btn-accent w-full text-base"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t('submitting')}
          </>
        ) : (
          <>
            <Check className="h-5 w-5" aria-hidden />
            {label ?? t('submit')}
          </>
        )}
      </motion.button>
    </div>
  )
}
