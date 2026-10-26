import { useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * Label + control + inline error. Errors appear under the field they belong
 * to rather than collecting in a summary at the top — on a phone the summary
 * scrolls out of view before you reach the offending input.
 */
export default function Field({ label, error, hint, optional = false, children, htmlFor }) {
  const { t } = useI18n()
  const generatedId = useId()
  const id = htmlFor ?? generatedId

  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
        {optional && <span className="ms-1 font-medium text-subtle">({t('optional')})</span>}
      </label>

      {typeof children === 'function' ? children(id) : children}

      {error && (
        <p className="mt-2 flex items-start gap-2 text-secondary font-medium text-danger" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}

      {hint && !error && <p className="mt-2 text-secondary text-muted">{hint}</p>}
    </div>
  )
}
