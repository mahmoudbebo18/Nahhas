import { useEffect } from 'react'
import { useProjects } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'

/**
 * Backfills the project crumb when a screen is reached without walking
 * through the project picker — a deep link, a shared URL, or a hard refresh
 * three levels in. The projects query is already cached in the normal flow,
 * so this costs nothing unless the trail is genuinely empty.
 */
export function useEnsureProjectCrumb(projectId) {
  const { trail, setStep } = useTrail()
  const known = trail.project && String(trail.project.id) === String(projectId)
  const { data: projects } = useProjects()

  useEffect(() => {
    if (known || !projectId || !projects) return
    const project = projects.find((p) => String(p.id) === String(projectId))
    if (!project) return
    setStep('project', {
      id: project.id,
      name: project.name,
      code: project.code,
      levelAware: project.level_aware !== false,
    })
  }, [known, projectId, projects, setStep])

  return trail.project
}
