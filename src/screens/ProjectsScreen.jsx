import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, RefreshCw } from 'lucide-react'
import Screen from '@/components/Screen'
import Tile, { TileGrid } from '@/components/Tile'
import StatusBadge from '@/components/StatusBadge'
import SearchField from '@/components/SearchField'
import { EmptyState, ErrorState, TileGridSkeleton } from '@/components/states'
import { useProjects } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { projectStatus } from '@/lib/status'
import { matches } from '@/lib/text'

/** GET /projects — the root of the walk. Shows only the engineer's own. */
export default function ProjectsScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { setStep, clearFrom } = useTrail()
  const query = useProjects()
  const [search, setSearch] = useState('')

  // Home is the start of the walk, so arriving here — from the home button
  // deep inside a task, or by backing all the way out — ends the old trail.
  // Left in place, the breadcrumb on the next screen would still name the
  // task the engineer has already walked away from.
  useEffect(() => {
    clearFrom('project')
  }, [clearFrom])

  const projects = query.data ?? []
  const filtered = useMemo(
    () => projects.filter((p) => matches(p.name, search) || matches(p.code, search)),
    [projects, search],
  )

  function open(project) {
    setStep('project', {
      id: project.id,
      name: project.name,
      code: project.code,
      levelAware: project.level_aware !== false,
    })
    // A legacy project has no level dimension — go straight to its task tree.
    navigate(
      project.level_aware === false
        ? `/projects/${project.id}/tasks`
        : `/projects/${project.id}/levels`,
    )
  }

  return (
    <Screen
      title={t('projects')}
      count={
        query.isSuccess && projects.length > 0 ? `${projects.length} ${t('projectsCount')}` : undefined
      }
      actions={
        <button
          type="button"
          onClick={() => query.refetch()}
          className="icon-btn"
          aria-label={t('refresh')}
          title={t('refresh')}
        >
          <RefreshCw className={`h-5 w-5 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden />
        </button>
      }
    >
      {projects.length > 6 && (
        <SearchField value={search} onChange={setSearch} placeholder={t('search')} />
      )}

      {query.isPending && <TileGridSkeleton count={4} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && filtered.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={t('emptyProjects')}
          body={search ? undefined : t('noProjectsAllowed')}
        />
      )}

      {filtered.length > 0 && (
        <TileGrid>
          {filtered.map((project) => {
            const status = projectStatus(project.state)
            return (
              <Tile
                key={project.id}
                title={project.name}
                subtitle={project.partner || undefined}
                meta={[
                  project.code,
                  project.num_of_units ? `${project.num_of_units} ${t('units')}` : null,
                ]}
                badges={[
                  status && (
                    <StatusBadge key="state" tone={status.tone}>
                      {t(status.key)}
                    </StatusBadge>
                  ),
                  project.level_aware === false && (
                    <StatusBadge key="legacy">{t('legacyProject')}</StatusBadge>
                  ),
                ].filter(Boolean)}
                onClick={() => open(project)}
              />
            )
          })}
        </TileGrid>
      )}
    </Screen>
  )
}
