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
      <button
        type="button"
        onClick={handleCopy}
        aria-label={label ?? t('copyName')}
        className={`icon-btn ${copied ? 'bg-success/10 text-success hover:bg-success/10 hover:text-success' : 'text-subtle'}`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      </button>

      <AnimatePresence>
        {state && (
          <motion.span
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none absolute bottom-full end-0 z-20 mb-1 whitespace-nowrap
                        rounded-badge px-2 py-1 text-meta font-semibold shadow-overlay ${
                          copied ? 'bg-text text-bg' : 'bg-danger text-bg'
                        }`}
          >
            {copied ? t('copied') : t('copyFailed')}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
