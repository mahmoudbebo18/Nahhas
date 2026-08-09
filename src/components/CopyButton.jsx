import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'
import { copyText } from '@/lib/clipboard'
import { useI18n } from '@/context/I18nContext'

/**
 * Copies one piece of data — a work item or sub-task name — to the clipboard.
 *
 * Names here are long Odoo strings the engineer has to paste into WhatsApp or
 * a report ("BLD-A / F03 / Blockwork — external"), and retyping them from a
 * phone is where the wrong task ends up on the message. So: one tap, and a
 * short confirmation that says which way it went.
 *
 * The confirmation is a pill floated above the button rather than a line of
 * text inside it — a row that grows by 20px when tapped pushes every row
 * below it, which on a list of sixty is worse than no feedback at all.
 */

const FEEDBACK_MS = 1600

export default function CopyButton({ value, label, className = '' }) {
  const { t } = useI18n()
  const [state, setState] = useState(null) // null | 'copied' | 'failed'
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function handleCopy(event) {
    // Rows are tap targets; copying must not also navigate.
    event.preventDefault()
    event.stopPropagation()

    const ok = await copyText(value)
    setState(ok ? 'copied' : 'failed')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState(null), FEEDBACK_MS)
  }

  const copied = state === 'copied'

  return (
    <span className={`relative inline-flex ${className}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        aria-label={label ?? t('copyName')}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                    transition-colors ${
                      copied
                        ? 'bg-success/15 text-success'
                        : 'text-subtle hover:bg-surface-2 hover:text-text'
                    }`}
      >
        {copied ? (
          <Check className="h-[18px] w-[18px]" aria-hidden />
        ) : (
          <Copy className="h-[18px] w-[18px]" aria-hidden />
        )}
      </motion.button>

      <AnimatePresence>
        {state && (
          <motion.span
            role="status"
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            className={`pointer-events-none absolute bottom-full end-0 z-20 mb-1 whitespace-nowrap
                        rounded-lg px-2 py-1 text-[11px] font-semibold shadow-overlay ${
                          copied ? 'bg-success text-white' : 'bg-danger text-white'
                        }`}
          >
            {copied ? t('copied') : t('copyFailed')}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
