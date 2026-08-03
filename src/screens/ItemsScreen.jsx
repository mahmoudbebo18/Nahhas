import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LayoutGrid, Search } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow from '@/components/ListRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useLevelItems } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'
import { matches } from '@/lib/text'

/**
 * GET /levels/<project_id>/<level>/items
 *
 * `floor_no: 0` is a REAL floor — "floor 00", typically the ground/basement
 * slab. Every check here is explicitly against null/undefined so a falsy 0 is
 * never mistaken for "no floor" and dropped from the label.
 */
export default function ItemsScreen() {
  const { projectId, level } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { trail, setStep, clearFrom } = useTrail()
  useEnsureProjectCrumb(projectId)

  const query = useLevelItems(projectId, level)
  const [search, setSearch] = useState('')

  useEffect(() => {
    clearFrom('item')
  }, [projectId, level, clearFrom])

  // Backfill the level crumb on a deep link — the items response echoes it.
  useEffect(() => {
    if (trail.level?.level === level || !query.data) return
    setStep('level', { level, label: t(`level_${level}`, level) })
  }, [level, query.data, trail.level, setStep, t])

  const items = query.data?.items ?? []
  const filtered = useMemo(
    () => items.filter((i) => matches(i.name, search) || matches(i.code, search)),
    [items, search],
  )

  /** "Building A · Floor 00" — floor 0 included, empty parts omitted. */
  function contextLine(item) {
    const parts = []
    if (item.building) parts.push(item.building)
    else if (item.building_code) parts.push(item.building_code)
    if (item.floor_no !== null && item.floor_no !== undefined) {
      parts.push(`${t('floor')} ${String(item.floor_no).padStart(2, '0')}`)
    }
    if (item.code) parts.push(item.code)
    return parts.join(' · ')
  }

  function open(item) {
    setStep('item', { taskId: item.task_id, name: item.name, code: item.code })
    navigate(`/items/${item.task_id}/subtasks`)
  }

  return (
    <Screen
      title={trail.level?.label ?? t(`level_${level}`, t('items'))}
      lead={t('pickItem')}
    >
      {items.length > 6 && (
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pickItem')}
            className="input ps-9"
          />
        </div>
      )}

      {query.isPending && <ListSkeleton rows={6} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && filtered.length === 0 && (
        <EmptyState icon={LayoutGrid} title={t('emptyItems')} />
      )}

      <ul className="space-y-2.5">
        {filtered.map((item, i) => (
          <li key={item.wbs_build_id ?? item.task_id}>
            <ListRow
              index={i}
              title={item.name}
              subtitle={contextLine(item)}
              meta={
                item.subtask_count != null
                  ? `${item.subtask_count} ${t('subtaskCount')}`
                  : undefined
              }
              onClick={() => open(item)}
              disabled={!item.task_id}
            />
          </li>
        ))}
      </ul>
    </Screen>
  )
}
