import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCheck, ClipboardCheck, FolderOpen, Inbox, Send, Trash2 } from 'lucide-react'
import Screen from '@/components/Screen'
import Sheet from '@/components/Sheet'
import Checkbox from '@/components/Checkbox'
import EntryCard from '@/components/EntryCard'
import { EmptyState, ErrorState, ListSkeleton, Spinner } from '@/components/states'
import { useToast } from '@/components/Toast'
import { useConfirmEntries, useDeleteEntry, useMyEntries } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'

/**
 * The review basket — GET /entries.
 *
 * Everything the engineer logs lands here as a draft first. They walk the site
 * logging as they go, then read the list back and tick what is ready to go to
 * the office. Confirmed entries stay below as read-only history, because
 * "what did I log here?" is asked just as often after submitting as before.
 *
 * Sending is per-entry, not all-or-nothing: half a day's walk is often ready
 * while one line is still waiting on a delivery note, and the alternative —
 * deleting it and logging it again tomorrow — is how quantities get lost.
 * Nothing is ticked on arrival, so the send button starts inert and the batch
 * is always something the engineer chose rather than something they inherited.
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
  const [picked, setPicked] = useState(() => new Set())

  const drafts = useMemo(() => query.data?.drafts ?? [], [query.data])
  const sent = history.data?.confirmed ?? []

  const draftGroups = useMemo(() => groupByTask(drafts), [drafts])

  // Drop ids that have left the basket — deleted here, or confirmed from
  // another device — so the button can never offer to send more than is there.
  useEffect(() => {
    setPicked((prev) => {
      if (prev.size === 0) return prev
      const live = new Set(drafts.map((entry) => entry.line_id))
      const next = new Set([...prev].filter((id) => live.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [drafts])

  const allPicked = drafts.length > 0 && picked.size === drafts.length

  function togglePicked(lineId, checked) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (checked) next.add(lineId)
      else next.delete(lineId)
      return next
    })
  }

  function toggleAll(checked) {
    setPicked(checked ? new Set(drafts.map((entry) => entry.line_id)) : new Set())
  }

  async function sendPicked() {
    // Filter the list rather than spreading the Set: the office reads the
    // batch in the order the entries were logged, not the order they were
    // ticked.
    const lineIds = drafts.filter((e) => picked.has(e.line_id)).map((e) => e.line_id)
    if (lineIds.length === 0) return
    try {
      const result = await confirm.mutateAsync(lineIds)
      setConfirming(false)
      setPicked(new Set())
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
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2
                id="pending-heading"
                className="flex items-baseline gap-2 text-[13px] font-bold uppercase tracking-wide text-muted"
              >
                {t('pending')}
                {drafts.length > 0 && (
                  <span className="tnum font-semibold text-accent">{drafts.length}</span>
                )}
              </h2>
              {drafts.length > 0 && (
                <Checkbox
                  checked={allPicked}
                  indeterminate={picked.size > 0 && !allPicked}
                  onChange={toggleAll}
                  label={t('selectAll')}
                  srLabel={t('selectAll')}
                />
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
                            selectable
                            selected={picked.has(entry.line_id)}
                            onSelectChange={(checked) =>
                              togglePicked(entry.line_id, checked)
                            }
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
                whileTap={picked.size === 0 ? undefined : { scale: 0.98 }}
                onClick={() => setConfirming(true)}
                // Nothing ticked is not an error worth explaining in a sheet —
                // the checkboxes are right above the button.
                disabled={confirm.isPending || picked.size === 0}
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
                    {allPicked ? t('confirmAll') : t('confirmSelected')} ({picked.size})
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
            onClick={sendPicked}
            disabled={confirm.isPending || picked.size === 0}
            className="btn-accent w-full"
          >
            {confirm.isPending ? <Spinner className="h-5 w-5" /> : null}
            {allPicked ? t('confirmAll') : t('confirmSelected')} ({picked.size})
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
