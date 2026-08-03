import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, FolderTree, ListTree } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow from '@/components/ListRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useLegacyTasks } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'
import Bidi from '@/components/Bidi'

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
      // A leaf is the work item entries hang off — same destination as the
      // level-aware flow, so everything downstream is shared.
      setStep('item', { taskId: task.id, name: task.name, code: task.code })
      navigate(`/items/${task.id}/subtasks`)
      return
    }
    setParams({ parent: String(task.id) })
  }

  return (
    <Screen
      title={project?.name ?? t('tasks')}
      lead={t('pickTask')}
      actions={
        <span className="mt-1 shrink-0 rounded-md bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent">
          {t('legacyProject')}
        </span>
      }
    >
      {ancestors.length > 0 && (
        <nav
          className="no-scrollbar mb-3 flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-2 px-2 py-1.5"
          aria-label={t('tasks')}
        >
          <button
            type="button"
            onClick={() => setParams({})}
            className="shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-muted hover:text-text"
          >
            <ListTree className="h-4 w-4" aria-hidden />
          </button>
          {ancestors.map((node, i) => (
            <span key={node.id} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="rtl-flip h-3.5 w-3.5 text-subtle" aria-hidden />
              <button
                type="button"
                disabled={i === ancestors.length - 1}
                onClick={() => setParams({ parent: String(node.id) })}
                className={`max-w-[9rem] truncate rounded-lg px-2 py-1 text-[13px] font-medium ${
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

      {query.isPending && <ListSkeleton rows={5} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && children.length === 0 && (
        <EmptyState icon={FolderTree} title={t('emptyTasks')} />
      )}

      <ul key={parent ?? 'root'} className="space-y-2.5">
        {children.map((task, i) => (
          <li key={task.id}>
            <ListRow
              index={i}
              title={task.name}
              subtitle={task.code || undefined}
              badges={
                task.is_leaf
                  ? [{ key: 'leaf', label: t('items'), tone: 'accent' }]
                  : undefined
              }
              onClick={() => open(task)}
            />
          </li>
        ))}
      </ul>
    </Screen>
  )
}
