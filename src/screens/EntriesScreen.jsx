import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCheck, ClipboardCheck, FolderOpen, Inbox, Send, Trash2 } from 'lucide-react'
import Screen from '@/components/Screen'
import Sheet from '@/components/Sheet'
import EntryCard from '@/components/EntryCard'
import { EmptyState, ErrorState, ListSkeleton, Spinner } from '@/components/states'
import { useToast } from '@/components/Toast'
import { useConfirmEntries, useDeleteEntry, useMyEntries } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'

/**
 * The review basket — GET /entries.
 *
 * Everything the engineer logs lands here as a draft first. They walk the site
 * logging as they go, then read the list back before one button sends the lot
 * to the office. Confirmed entries stay below as read-only history, because
 * "what did I log here?" is asked just as often after submitting as before.
 *
 * Grouping is by project → sub-task, which is how the engineer remembers the
 * work ("the material on Tower B floor 3"), not by entry type.
 */
export default function EntriesScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const toast = useToast()

  // Two queries, not one: the drafts key is shared with the top bar's badge,
  // so opening this screen costs exactly one extra request (the history).
  const query = useMyEntries('draft')
  const history = useMyEntries('confirmed')
  const confirm = useConfirmEntries()
  const remove = useDeleteEntry()

  const [confirming, setConfirming] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  const drafts = query.data?.drafts ?? []
  const sent = history.data?.confirmed ?? []

  const draftGroups = useMemo(() => groupByTask(drafts), [drafts])

  async function sendAll() {
    try {
      const result = await confirm.mutateAsync()
      setConfirming(false)
      toast.success(`${t('confirmedToast')} (${result.confirmed_count})`)
    } catch (err) {
      setConfirming(false)
      toast.error(err.message)
    }
  }

  async function discard(entry) {
    try {
      await remove.mutateAsync(entry.line_id)
      setPendingDelete(null)
      toast.success(t('deletedToast'))
    } catch (err) {
      setPendingDelete(null)
      toast.error(err.message)
    }
  }

  return (
    <Screen title={t('myEntries')} lead={t('reviewLead')}>
      {query.isPending && <ListSkeleton rows={4} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && (
        <>
          <section aria-labelledby="pending-heading">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h2 id="pending-heading" className="text-[13px] font-bold uppercase tracking-wide text-muted">
                {t('pending')}
              </h2>
              {drafts.length > 0 && (
                <span className="tnum text-[13px] font-semibold text-accent">
                  {drafts.length}
                </span>
              )}
            </div>

            {drafts.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={t('emptyDrafts')}
                body={t('emptyDraftsHint')}
                // An empty basket is a dead end otherwise: the only way on is
                // back into the walk, so offer it here rather than making the
                // engineer find the top bar.
                action={
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/projects')}
                    className="btn-primary mt-1"
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden />
                    {t('goToProjects')}
                  </motion.button>
                }
              />
            ) : (
              <div className="space-y-4">
                {draftGroups.map((group, groupIndex) => (
                  <div key={group.key}>
                    <p className="mb-1.5 truncate px-1 text-[13px] font-semibold text-text">
                      {group.title}
                    </p>
                    {group.subtitle && (
                      <p className="mb-2 truncate px-1 text-[12px] text-subtle">
                        {group.subtitle}
                      </p>
                    )}
                    <ul className="space-y-2.5">
                      {group.entries.map((entry, i) => (
                        <li key={entry.line_id}>
                          <EntryCard
                            entry={entry}
                            index={groupIndex + i}
                            onEdit={() =>
                              navigate(`/entries/${entry.line_id}/edit`)
                            }
                            onDelete={() => setPendingDelete(entry)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {sent.length > 0 && (
            <section aria-labelledby="sent-heading" className="mt-8">
              <h2
                id="sent-heading"
                className="mb-2 flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-muted"
              >
                <CheckCheck className="h-4 w-4" aria-hidden />
                {t('sent')}
              </h2>
              <ul className="space-y-2.5">
                {sent.map((entry, i) => (
                  <li key={entry.line_id}>
                    {/* Flat list, so each row carries its own sub-task. */}
                    <EntryCard entry={entry} index={i} readOnly showContext />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {drafts.length > 0 && (
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-bg/90 px-4 py-3 pb-safe backdrop-blur">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setConfirming(true)}
                disabled={confirm.isPending}
                className="btn-accent w-full text-base"
              >
                {confirm.isPending ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    {t('confirmingEntries')}
                  </>
                ) : (
                  <>
                    <Send className="rtl-flip h-5 w-5" aria-hidden />
                    {t('confirmAll')} ({drafts.length})
                  </>
                )}
              </motion.button>
            </div>
          )}
        </>
      )}

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('confirmTitle')}
      >
        <div className="p-4">
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-surface-2 p-4">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
            <p className="text-sm leading-relaxed text-muted">{t('confirmBody')}</p>
          </div>
          <button
            type="button"
            onClick={sendAll}
            disabled={confirm.isPending}
            className="btn-accent w-full"
          >
            {confirm.isPending ? <Spinner className="h-5 w-5" /> : null}
            {t('confirmAll')} ({drafts.length})
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="btn-ghost mt-2 w-full"
          >
            {t('cancel')}
          </button>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title={t('deleteConfirmTitle')}
      >
        <div className="p-4">
          <p className="mb-4 rounded-2xl bg-surface-2 p-4 text-sm leading-relaxed text-muted">
            {t('deleteConfirmBody')}
          </p>
          <button
            type="button"
            onClick={() => discard(pendingDelete)}
            disabled={remove.isPending}
            className="btn w-full border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
          >
            {remove.isPending ? <Spinner className="h-5 w-5" /> : <Trash2 className="h-4 w-4" />}
            {t('deleteEntry')}
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(null)}
            className="btn-ghost mt-2 w-full"
          >
            {t('cancel')}
          </button>
        </div>
      </Sheet>
    </Screen>
  )
}

/**
 * Group entries by the sub-task they were logged against, preserving the
 * server's newest-first order. The heading is the project; the sub-heading is
 * the location the engineer was standing in when they logged it.
 */
function groupByTask(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const key = String(entry.task_id)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: entry.project || entry.task || '—',
        subtitle: [entry.building, entry.task].filter(Boolean).join(' · '),
        entries: [],
      })
    }
    groups.get(key).entries.push(entry)
  }
  return [...groups.values()]
}
