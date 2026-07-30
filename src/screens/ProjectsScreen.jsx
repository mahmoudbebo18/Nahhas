import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FolderOpen, RefreshCw, Search } from 'lucide-react'
import Screen from '@/components/Screen'
import ListRow, { listStagger } from '@/components/ListRow'
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states'
import { useProjects } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { humanise, matches } from '@/lib/text'

/** GET /projects — the root of the walk. Shows only the engineer's own. */
export default function ProjectsScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { setStep } = useTrail()
  const query = useProjects()
  const [search, setSearch] = useState('')

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
      lead={t('pickProject')}
      actions={
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={() => query.refetch()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
          aria-label={t('refresh')}
        >
          <RefreshCw className={`h-5 w-5 ${query.isFetching ? 'animate-spin' : ''}`} aria-hidden />
        </motion.button>
      }
    >
      {projects.length > 6 && (
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-subtle"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pickProject')}
            className="input ps-9"
          />
        </div>
      )}

      {query.isPending && <ListSkeleton rows={5} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && filtered.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title={t('emptyProjects')}
          body={search ? undefined : t('noProjectsAllowed')}
        />
      )}

      <motion.ul variants={listStagger} initial="initial" animate="animate" className="space-y-2.5">
        {filtered.map((project) => (
          <motion.li key={project.id}>
            <ListRow
              title={project.name}
              subtitle={[project.code, project.partner].filter(Boolean).join(' · ')}
              meta={
                project.num_of_units
                  ? `${project.num_of_units} ${t('units')}`
                  : undefined
              }
              badges={[
                project.state && { key: 'state', label: humanise(project.state), tone: 'muted' },
                project.level_aware === false && {
                  key: 'legacy',
                  label: t('legacyProject'),
                  tone: 'accent',
                },
              ].filter(Boolean)}
              onClick={() => open(project)}
            />
          </motion.li>
        ))}
      </motion.ul>
    </Screen>
  )
}
