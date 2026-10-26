import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, FolderTree, ListTree, PackageX } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow from '@/components/ListRow'
import StatusBadge, { taskBadges } from '@/components/StatusBadge'
import DateRange from '@/components/DateRange'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { hasNothingToEnter } from '@/api/entryTypes'
import { useLegacyTasks } from '@/api/queries'
import TodayTasks from './TodayTasks'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'
import Bidi from '@/components/Bidi'
import TimelineButton from '@/components/TimelineButton'

/**
 * GET /projects/<id>/tasks — the fallback for non-level-aware ("legacy")
 * projects. One flat array with parent_id + is_leaf; we drill it in place.
 *
 * The current node lives in `?parent=`, which means the phone's back button
 * walks back up the tree for free instead of jumping out of the project.
 */

/** Odoo many2one fields arrive as `false`, an id, or an `[id, name]` pair. */
function parentIdOf(task) {
  const raw = task.parent_id
  if (Array.isArray(raw)) return raw[0] ?? null
  if (raw === false || raw === null || raw === undefined || raw === 0) return null
  return raw
}

export default function LegacyTasksScreen() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { t } = useI18n()
  const { setStep, clearFrom } = useTrail()
  const project = useEnsureProjectCrumb(projectId)
  const query = useLegacyTasks(projectId)

  const parent = params.get('parent')

  useEffect(() => {
    clearFrom('level')
  }, [projectId, clearFrom])

  const tasks = useMemo(() => {
    const raw = query.data
    if (Array.isArray(raw)) return raw
    return raw?.tasks ?? raw?.items ?? []
  }, [query.data])

  const children = useMemo(
    () => tasks.filter((task) => String(parentIdOf(task) ?? '') === String(parent ?? '')),
    [tasks, parent],
  )

  /** Ancestor chain of the current node, derived from the flat tree. */
  const ancestors = useMemo(() => {
    if (!parent) return []
    const byId = new Map(tasks.map((task) => [String(task.id), task]))
    const chain = []
    let cursor = byId.get(String(parent))
    while (cursor && chain.length < 12) {
      chain.unshift(cursor)
      const up = parentIdOf(cursor)
      cursor = up == null ? null : byId.get(String(up))
    }
    return chain
  }, [tasks, parent])

  function open(task) {
    if (task.is_leaf) {
      // A legacy tree ends AT the logging point: the leaf IS the sub-task,
      // not a work item with sub-tasks beneath it. Routing it to the sub-task
      // list would ask for children a leaf cannot have by definition — an
      // empty state every time, for every legacy project. Go straight to the
      // entry hub, which is where the level-aware walk lands too.
      const item = ancestors[ancestors.length - 1]
      if (item) setStep('item', { taskId: item.id, name: item.name, code: item.code })
      setStep('subtask', { taskId: task.id, name: task.name })
      navigate(`/subtasks/${task.id}`)
      return
    }
    setParams({ parent: String(task.id) })
  }

  return (
    <Screen
      title={project?.name ? <Bidi>{project.name}</Bidi> : t('tasks')}
      meta={<StatusBadge>{t('legacyProject')}</StatusBadge>}
      actions={parent ? undefined : <TimelineButton projectId={projectId} />}
      width="narrow"
    >
      {ancestors.length > 0 && (
        <nav
          className="no-scrollbar mb-4 flex items-center gap-1 overflow-x-auto rounded-control bg-surface-2 px-1"
          aria-label={t('tasks')}
        >
          <button
            type="button"
            onClick={() => setParams({})}
            className="icon-btn"
            aria-label={t('tasks')}
          >
            <ListTree className="h-5 w-5" aria-hidden />
          </button>
          {ancestors.map((node, i) => (
            <span key={node.id} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="rtl-flip h-4 w-4 text-subtle" aria-hidden />
              <button
                type="button"
                disabled={i === ancestors.length - 1}
                onClick={() => setParams({ parent: String(node.id) })}
                className={`h-touch max-w-[12rem] truncate rounded-control px-2 text-secondary font-medium ${
                  i === ancestors.length - 1
                    ? 'cursor-default text-text'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Bidi>{node.name}</Bidi>
              </button>
            </span>
          ))}
        </nav>
      )}

      {/* At the root only: deeper in, the engineer has already chosen a
          branch, and the day's list would sit between them and it. */}
      {!parent && <TodayTasks projectId={projectId} />}

      {query.isPending && <ListSkeleton rows={5} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && children.length === 0 && (
        <EmptyState icon={FolderTree} title={t('emptyTasks')} />
      )}

      <ul key={parent ?? 'root'} className="space-y-3">
        {children.map((task) => {
          // Leaves are the logging points, so they carry the same "is there
          // anything here" answer the level-aware list shows on its sub-tasks.
          const barren = task.is_leaf && hasNothingToEnter(task.available)
          return (
            <li key={task.id}>
              <ListRow
                title={task.name}
                subtitle={task.code || undefined}
                badges={[
                  (task.date_start || task.date_end) && (
                    <DateRange key="dates" start={task.date_start} end={task.date_end} />
                  ),
                  ...taskBadges(task, t),
                  task.is_leaf &&
                    (barren ? (
                      <StatusBadge key="barren" icon={PackageX}>
                        {t('nothingToEnter')}
                      </StatusBadge>
                    ) : (
                      <StatusBadge key="leaf" tone="primary">
                        {t('logHere')}
                      </StatusBadge>
                    )),
                ].filter(Boolean)}
                copyText={task.name}
                dimmed={barren}
                onClick={() => open(task)}
              />
            </li>
          )
        })}
      </ul>
    </Screen>
  )
}
