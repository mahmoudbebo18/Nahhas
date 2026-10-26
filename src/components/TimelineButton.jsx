import { Link } from 'react-router-dom'
import { ChartGantt } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * The way into a project's timeline, beside the project's title. Icon-only
 * under 400px, where the word would squeeze a long project name into one
 * column of single words.
 */
export default function TimelineButton({ projectId }) {
  const { t } = useI18n()
  return (
    <Link
      to={`/projects/${projectId}/timeline`}
      aria-label={t('timeline')}
      className="btn-outline min-h-touch px-3 text-secondary"
    >
      <ChartGantt className="h-4 w-4 text-muted" aria-hidden />
      <span className="hidden xs:inline">{t('timeline')}</span>
    </Link>
  )
}
