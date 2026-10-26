import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Building, Building2, Home, Layers, Plus } from 'lucide-react'
import Screen from '@/components/Screen'
import Tile, { TileGrid } from '@/components/Tile'
import Bidi from '@/components/Bidi'
import TimelineButton from '@/components/TimelineButton'
import { EmptyState, ErrorState, TileGridSkeleton } from '@/components/states'
import { useLevels } from '@/api/queries'
import TodayTasks from './TodayTasks'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'

/**
 * GET /projects/<id>/levels
 *
 * Only levels that actually exist come back, so the list is exactly what this
 * project offers — never a fixed five-row menu with dead entries. A legacy
 * project answers `level_aware:false` with an empty array and is redirected to
 * the flat task tree.
 */

// The icon is information here, not decoration: it tells a building from a
// floor from a unit before the label is read.
const LEVEL_ICONS = {
  project: Layers,
  building: Building2,
  floor: Building,
  unit: Home,
  additional_unit: Plus,
}

export default function LevelsScreen() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { setStep, clearFrom } = useTrail()
  const project = useEnsureProjectCrumb(projectId)
  const query = useLevels(projectId)

  // Arriving here means the engineer backed out of a deeper screen; drop any
  // level/item/subtask crumbs so the trail matches where they actually are.
  useEffect(() => {
    clearFrom('level')
  }, [projectId, clearFrom])

  if (query.data && query.data.level_aware === false) {
    return <Navigate to={`/projects/${projectId}/tasks`} replace />
  }

  const levels = query.data?.levels ?? []
  // Our own name first: Odoo sends the selection label in English whatever
  // the UI language, which left "Building" on an Arabic screen.
  const levelLabel = (level) => t(`level_${level.level}`, level.label || level.level)

  function open(level) {
    setStep('level', { level: level.level, label: levelLabel(level) })
    navigate(`/projects/${projectId}/levels/${level.level}/items`)
  }

  return (
    <Screen
      title={project?.name ? <Bidi>{project.name}</Bidi> : t('levels')}
      meta={project?.code ? <Bidi>{project.code}</Bidi> : undefined}
      actions={<TimelineButton projectId={projectId} />}
    >
      <TodayTasks projectId={projectId} />

      {query.isPending && <TileGridSkeleton count={4} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && levels.length === 0 && (
        <EmptyState icon={Layers} title={t('emptyLevels')} />
      )}

      {levels.length > 0 && (
        <TileGrid>
          {levels.map((level) => (
            <Tile
              key={level.level}
              icon={LEVEL_ICONS[level.level] ?? Layers}
              title={levelLabel(level)}
              meta={[level.item_count != null ? `${level.item_count} ${t('itemsCount')}` : null]}
              onClick={() => open(level)}
            />
          ))}
        </TileGrid>
      )}
    </Screen>
  )
}
