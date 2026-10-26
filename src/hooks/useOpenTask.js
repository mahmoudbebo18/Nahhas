import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'

/**
 * Opens a task reached from outside the walk — a "today" tile, a timeline
 * bar — with the breadcrumb built as though the engineer had walked there:
 * project › level › work item › sub-task.
 *
 * Takes the row shape GET /tasks/today and GET /projects/<id>/timeline share.
 */
export function useOpenTask() {
  const navigate = useNavigate()
  const { setStep } = useTrail()
  const { t } = useI18n()

  return useCallback(
    (task) => {
      setStep('project', {
        id: task.project_id,
        name: task.project,
        code: task.project_code,
        levelAware: task.level_aware !== false,
      })
      if (task.level_aware && task.level) {
        setStep('level', { level: task.level, label: t(`level_${task.level}`, t('items')) })
      }
      if (!task.is_leaf && !task.level_aware) {
        // A legacy project has no work-item screen: a branch opens in its tree.
        navigate(`/projects/${task.project_id}/tasks?parent=${task.id}`)
        return
      }
      if (!task.is_leaf) {
        setStep('item', { taskId: task.id, name: task.name })
        navigate(`/items/${task.id}/subtasks`)
        return
      }
      if (task.item_id) setStep('item', { taskId: task.item_id, name: task.item })
      setStep('subtask', { taskId: task.id, name: task.name, state: task.state })
      navigate(`/subtasks/${task.id}`)
    },
    [navigate, setStep, t],
  )
}
