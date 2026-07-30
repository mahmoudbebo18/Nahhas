import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building, Building2, Home, Layers, Plus } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow, { listStagger } from '@/components/ListRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useLevels } from '@/api/queries'
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

  function open(level) {
    setStep('level', {
      level: level.level,
      label: level.label || t(`level_${level.level}`, level.level),
    })
    navigate(`/projects/${projectId}/levels/${level.level}/items`)
  }

  return (
    <Screen title={project?.name ?? t('levels')} lead={t('pickLevel')}>
      {query.isPending && <ListSkeleton rows={4} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && levels.length === 0 && (
        <EmptyState icon={Layers} title={t('emptyLevels')} />
      )}

      <motion.ul variants={listStagger} initial="initial" animate="animate" className="space-y-2.5">
        {levels.map((level) => {
          const Icon = LEVEL_ICONS[level.level] ?? Layers
          return (
            <motion.li key={level.level}>
              <ListRow
                leading={
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                }
                title={level.label || t(`level_${level.level}`, level.level)}
                meta={
                  level.item_count != null
                    ? `${level.item_count} ${t('itemsCount')}`
                    : undefined
                }
                onClick={() => open(level)}
              />
            </motion.li>
          )
        })}
      </motion.ul>
    </Screen>
  )
}
