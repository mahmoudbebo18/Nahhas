import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleCheckBig, Inbox } from 'lucide-react'
import Sheet from '@/components/Sheet'
import { Spinner } from '@/components/states'
import { useToast } from '@/components/Toast'
import { useCloseTask, useMyEntries } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'

/**
 * "Mark done" for a work item or a sub-task, and the sheet that confirms it.
 *
 * The sheet says what else closes — a work item takes its open sub-tasks with
 * it — and that there is no undoing it from here: only the office reopens a
 * task, from Odoo, because a work item may already carry a completion request.
 *
 * Drafts block it. The engineer's own are known before asking (the review
 * basket is already loaded for the top bar's badge), so the sheet opens on
 * "send these first" rather than on a button that would only fail. Anyone
 * else's only the server knows; its 409 lands on the same state.
 *
 * `taskIds` is the task and its sub-tasks — what the engineer's drafts are
 * matched against. `openSubtasks` is how many of those sub-tasks are open.
 * The label stays at every width: a bare tick is too easy to misread for
 * something only the office can undo.
 */
export default function CloseTask({ taskId, taskIds, kind = 'subtask', openSubtasks = 0, className = '' }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()
  const close = useCloseTask()
  const drafts = useMyEntries('draft').data?.drafts
  const [open, setOpen] = useState(false)
  // The server's word on drafts, once it has refused: { total, own }.
  const [refused, setRefused] = useState(null)

  const ownDrafts = useMemo(() => {
    const ids = new Set((taskIds ?? [taskId]).map(String))
    return (drafts ?? []).filter((entry) => ids.has(String(entry.task_id))).length
  }, [drafts, taskIds, taskId])

  const blocked = refused ?? (ownDrafts > 0 ? { total: ownDrafts, own: ownDrafts } : null)
  const isItem = kind === 'item'
  const label = isItem ? t('closeItem') : t('closeSubtask')

  function dismiss() {
    setOpen(false)
    setRefused(null)
  }

  async function confirm() {
    try {
      await close.mutateAsync(taskId)
      dismiss()
      toast.success(isItem ? t('closedItemToast') : t('closedSubtaskToast'))
    } catch (err) {
      if (err?.status === 409 && err.body?.code === 'drafts') {
        setRefused({ total: err.body.draft_count ?? 0, own: err.body.own_draft_count ?? 0 })
        return
      }
      dismiss()
      toast.error(err.message)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-outline min-h-touch px-3 text-secondary ${className}`}
      >
        <CircleCheckBig className="h-4 w-4 text-success" aria-hidden />
        {label}
      </button>

      <Sheet open={open} onClose={dismiss} title={isItem ? t('closeItemTitle') : t('closeSubtaskTitle')}>
        <div className="p-4">
          {blocked ? (
            <>
              <p className="mb-2 font-semibold">
                {isItem ? t('closeBlockedItem') : t('closeBlockedSubtask')}{' '}
                <span className="tnum">({blocked.total})</span>
              </p>
              <p className="mb-4 text-secondary text-muted">
                {blocked.own > 0 ? t('closeBlockedOwn') : t('closeBlockedOthers')}
              </p>
              {blocked.own > 0 && (
                <button type="button" onClick={() => navigate('/entries')} className="btn-primary w-full">
                  <Inbox className="h-5 w-5" aria-hidden />
                  {t('reviewDrafts')}
                </button>
              )}
              <button type="button" onClick={dismiss} className="btn-ghost mt-2 w-full">
                {blocked.own > 0 ? t('cancel') : t('close')}
              </button>
            </>
          ) : (
            <>
              {isItem && openSubtasks > 0 && (
                <p className="mb-2 font-semibold">
                  {t('closeCascade')} <span className="tnum">({openSubtasks})</span>
                </p>
              )}
              <p className="mb-4 text-secondary text-muted">{t('closeBody')}</p>
              <button type="button" onClick={confirm} disabled={close.isPending} className="btn-primary w-full">
                {close.isPending ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <CircleCheckBig className="h-5 w-5" aria-hidden />
                )}
                {label}
              </button>
              <button type="button" onClick={dismiss} className="btn-ghost mt-2 w-full">
                {t('cancel')}
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  )
}
