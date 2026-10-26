import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, PackageX } from 'lucide-react'
import Screen from '@/components/Screen'
import Tile, { TileGrid } from '@/components/Tile'
import StatusBadge, { taskBadges } from '@/components/StatusBadge'
import DateRange from '@/components/DateRange'
import Bidi from '@/components/Bidi'
import CloseTask from '@/components/CloseTask'
import { EmptyState, ErrorState, TileGridSkeleton } from '@/components/states'
import { hasNothingToEnter } from '@/api/entryTypes'
import { useSubtasks } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { isTaskClosed } from '@/lib/status'

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
  const openSubtasks = subtasks.filter((subtask) => !isTaskClosed(subtask.state)).length
  const canClose = query.isSuccess && !isTaskClosed(query.data?.state)

  // Where this work item is — the one fact worth a line under its name.
  const context = [query.data?.building, query.data?.level && t(`level_${query.data.level}`, '')]
    .filter(Boolean)
    .join(' · ')

  function open(subtask) {
    setStep('subtask', { taskId: subtask.id, name: subtask.name, state: subtask.state })
    navigate(`/subtasks/${subtask.id}`)
  }

  return (
    <Screen
      title={query.data?.name ? <Bidi>{query.data.name}</Bidi> : t('subtasks')}
      meta={
        context || query.data?.date_start || query.data?.date_end ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {context && <Bidi>{context}</Bidi>}
            <DateRange start={query.data?.date_start} end={query.data?.date_end} />
            {query.data && taskBadges(query.data, t)}
          </span>
        ) : undefined
      }
      actions={
        canClose && (
          <CloseTask
            taskId={query.data.task_id}
            taskIds={[query.data.task_id, ...subtasks.map((subtask) => subtask.id)]}
            kind="item"
            openSubtasks={openSubtasks}
          />
        )
      }
    >
      {query.isPending && <TileGridSkeleton count={4} />}

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
              className="btn-outline"
            >
              {t('logWork')}
            </button>
          }
        />
      )}

      {subtasks.length > 0 && (
        <TileGrid>
          {subtasks.map((subtask) => {
            // `available` counts what each entry type actually holds, so it —
            // not has_products/has_template, which only say something is
            // linked — decides whether this box leads anywhere the portal can
            // write.
            const barren = hasNothingToEnter(subtask.available)
            return (
              <Tile
                key={subtask.id}
                title={subtask.name}
                // Only the sub-task's own plan. One with none shares the work
                // item's, which is already under the screen title — repeating
                // it on every box would say the same thing six times.
                dates={<DateRange start={subtask.date_start} end={subtask.date_end} />}
                badges={[
                  ...taskBadges(subtask, t),
                  barren && (
                    <StatusBadge key="barren" icon={PackageX}>
                      {t('nothingToEnter')}
                    </StatusBadge>
                  ),
                ].filter(Boolean)}
                // Sub-task names are what gets pasted into a message to the
                // office, and they are far too long to retype from a phone.
                copyText={subtask.name}
                // Still tappable: a photo can be attached to any sub-task, and
                // that is the one thing these boxes are still good for.
                dimmed={barren}
                onClick={() => open(subtask)}
              />
            )
          })}
        </TileGrid>
      )}
    </Screen>
  )
}
