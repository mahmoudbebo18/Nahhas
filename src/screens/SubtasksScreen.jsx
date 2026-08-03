import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, LayoutTemplate, PackageCheck } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow from '@/components/ListRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useSubtasks } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { humanise } from '@/lib/text'

/**
 * GET /items/<task_id>/subtasks — the last step of the walk. Entries are
 * logged against a sub-task, not the work item itself.
 */
export default function SubtasksScreen() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { setStep, clearFrom } = useTrail()
  const query = useSubtasks(taskId)

  useEffect(() => {
    clearFrom('subtask')
  }, [taskId, clearFrom])

  // The response carries the work item's own name — use it to fix the crumb
  // when this screen was reached by deep link rather than by drilling.
  useEffect(() => {
    if (!query.data?.name) return
    setStep('item', { taskId, name: query.data.name })
  }, [query.data?.name, taskId, setStep])

  const subtasks = query.data?.subtasks ?? []

  const context = [query.data?.building, query.data?.level && t(`level_${query.data.level}`, '')]
    .filter(Boolean)
    .join(' · ')

  function open(subtask) {
    setStep('subtask', { taskId: subtask.id, name: subtask.name })
    navigate(`/subtasks/${subtask.id}`)
  }

  return (
    <Screen title={query.data?.name ?? t('subtasks')} lead={context || t('pickSubtask')}>
      {query.isPending && <ListSkeleton rows={5} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && subtasks.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t('emptySubtasks')}
          action={
            // Legacy trees sometimes end at a task that IS the logging point.
            // Rather than dead-ending, offer to log against it directly.
            <button
              type="button"
              onClick={() => {
                setStep('subtask', { taskId, name: query.data?.name ?? t('items') })
                navigate(`/subtasks/${taskId}`)
              }}
              className="btn-outline mt-1"
            >
              {t('logWork')}
            </button>
          }
        />
      )}

      <ul className="space-y-2.5">
        {subtasks.map((subtask, i) => (
          <li key={subtask.id}>
            <ListRow
              index={i}
              title={subtask.name}
              subtitle={humanise(subtask.stage || subtask.state) || undefined}
              badges={[
                subtask.has_products && {
                  key: 'products',
                  label: t('hasProducts'),
                  tone: 'primary',
                  icon: <PackageCheck className="h-3 w-3" aria-hidden />,
                },
                subtask.has_template && {
                  key: 'template',
                  label: t('fromTemplate'),
                  tone: 'muted',
                  icon: <LayoutTemplate className="h-3 w-3" aria-hidden />,
                },
              ].filter(Boolean)}
              onClick={() => open(subtask)}
            />
          </li>
        ))}
      </ul>
    </Screen>
  )
}
