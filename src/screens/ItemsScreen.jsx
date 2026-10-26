import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LayoutGrid } from 'lucide-react'
import Screen from '@/components/Screen'
import Tile, { TileGrid } from '@/components/Tile'
import Collapsible, { ExpandAllButton } from '@/components/Collapsible'
import SearchField from '@/components/SearchField'
import Bidi from '@/components/Bidi'
import DateRange from '@/components/DateRange'
import { taskBadges } from '@/components/StatusBadge'
import { EmptyState, ErrorState, TileGridSkeleton } from '@/components/states'
import { useLevelItems } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'
import { useCollapsed } from '@/hooks/useCollapsed'
import { matches } from '@/lib/text'

/**
 * GET /levels/<project_id>/<level>/items
 *
 * Grouped under one heading per building, because that is how a site is
 * walked — "Tower B, then its floors" — and a flat grid of sixty items mixes
 * three towers' floor 03s together. Each building folds away, so the engineer
 * can shut the towers they are not standing in.
 *
 * `floor_no: 0` is a REAL floor — "floor 00", typically the ground/basement
 * slab. Every check here is explicitly against null/undefined so a falsy 0 is
 * never mistaken for "no floor" and dropped from the label.
 */
export default function ItemsScreen() {
  const { projectId, level } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { setStep, clearFrom } = useTrail()
  useEnsureProjectCrumb(projectId)

  const query = useLevelItems(projectId, level)
  const [search, setSearch] = useState('')
  const levelLabel = t(`level_${level}`, t('items'))

  useEffect(() => {
    clearFrom('item')
  }, [projectId, level, clearFrom])

  // Keep the level crumb in step with the URL — on a deep link there is none
  // yet, and a label stored by an older build may be in the wrong language.
  useEffect(() => {
    setStep('level', { level, label: levelLabel })
  }, [level, levelLabel, setStep])

  const items = query.data?.items ?? []
  const filtered = useMemo(
    () => items.filter((i) => matches(i.name, search) || matches(i.code, search)),
    [items, search],
  )
  const groups = useMemo(() => groupByBuilding(filtered), [filtered])
  // A level with no buildings at all (the project level itself) is one plain
  // grid; a heading that says "No building" over everything says nothing.
  const showHeadings = groups.length > 1 || groups[0]?.building

  const buildings = useCollapsed(`items:${projectId}:${level}`, true)
  // A search looks through every building: a match folded away inside a shut
  // one would read as "not found".
  const searching = search.trim() !== ''
  const isOpen = (key) => searching || buildings.isOpen(key)

  function open(item) {
    setStep('item', { taskId: item.task_id, name: item.name, code: item.code })
    navigate(`/items/${item.task_id}/subtasks`)
  }

  return (
    <Screen
      title={levelLabel}
      count={query.isSuccess && items.length > 0 ? `${items.length} ${t('itemsCount')}` : undefined}
      // Beside the title rather than on a row of its own under the search: it
      // acts on the whole screen, and a row for one button wastes a phone's
      // first screenful.
      actions={
        showHeadings &&
        groups.length > 1 &&
        !searching && (
          <ExpandAllButton
            allOpen={groups.every((g) => buildings.isOpen(g.key))}
            onChange={(open) =>
              buildings.setAll(
                groups.map((g) => g.key),
                open,
              )
            }
          />
        )
      }
    >
      {items.length > 6 && (
        <SearchField value={search} onChange={setSearch} placeholder={t('search')} />
      )}

      {query.isPending && <TileGridSkeleton count={6} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && filtered.length === 0 && (
        <EmptyState icon={LayoutGrid} title={t('emptyItems')} />
      )}

      <div className="space-y-6">
        {groups.map((group) => {
          const grid = (
            <TileGrid>
              {group.items.map((item) => (
                <Tile
                  key={item.wbs_build_id ?? item.task_id}
                  title={item.name}
                  meta={[
                    item.floor_no !== null && item.floor_no !== undefined && item.floor_no !== false
                      ? `${t('floor')} ${String(item.floor_no).padStart(2, '0')}`
                      : null,
                    item.subtask_count != null ? `${item.subtask_count} ${t('subtaskCount')}` : null,
                  ]}
                  dates={<DateRange start={item.date_start} end={item.date_end} />}
                  badges={taskBadges(item, t)}
                  copyText={item.name}
                  onClick={() => open(item)}
                  disabled={!item.task_id}
                />
              ))}
            </TileGrid>
          )
          return showHeadings ? (
            <Collapsible
              key={group.key}
              as="h2"
              size="section"
              open={isOpen(group.key)}
              onToggle={() => buildings.toggle(group.key)}
              title={group.building ? <Bidi>{group.building}</Bidi> : t('noBuilding')}
              count={group.items.length}
            >
              {grid}
            </Collapsible>
          ) : (
            <section key={group.key}>{grid}</section>
          )
        })}
      </div>
    </Screen>
  )
}

/** Items in the server's order (building, floor, name), split per building. */
function groupByBuilding(items) {
  const groups = new Map()
  for (const item of items) {
    const building = item.building || item.building_code || null
    const key = String(item.building_id || building || 'none')
    if (!groups.has(key)) groups.set(key, { key, building, items: [] })
    groups.get(key).items.push(item)
  }
  return [...groups.values()]
}
