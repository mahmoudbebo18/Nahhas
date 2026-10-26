import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, Inbox, Send, Trash2 } from 'lucide-react'
import Screen from '@/components/Screen'
import Sheet from '@/components/Sheet'
import Bidi from '@/components/Bidi'
import Checkbox from '@/components/Checkbox'
import Collapsible, { ExpandAllButton } from '@/components/Collapsible'
import EntryCard from '@/components/EntryCard'
import { EmptyState, ErrorState, ListSkeleton, Spinner } from '@/components/states'
import { useToast } from '@/components/Toast'
import { useConfirmEntries, useDeleteEntry, useMyEntries } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useCollapsed } from '@/hooks/useCollapsed'

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
 * work ("the material on Tower B floor 3"), not by entry type. Each group
 * folds away and has its own checkbox, so a long day's basket can be worked
 * through one location at a time. The sent history starts folded: it is
 * reference, and open it would push the send button's subject off screen.
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
  const sent = useMemo(() => history.data?.confirmed ?? [], [history.data])

  const draftGroups = useMemo(() => groupByTask(drafts), [drafts])
  const sentGroups = useMemo(() => groupByTask(sent), [sent])

  const draftsOpen = useCollapsed('entries:drafts', true)
  const sentOpen = useCollapsed('entries:sent', false)
  const sentGroupsOpen = useCollapsed('entries:sent-groups', true)

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

  function togglePickedMany(lineIds, checked) {
    setPicked((prev) => {
      const next = new Set(prev)
      for (const id of lineIds) {
        if (checked) next.add(id)
        else next.delete(id)
      }
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
    <Screen
      title={t('myEntries')}
      width="narrow"
      // Beside the title, as on the items screen: it acts on the whole list
      // of drafts, and a row of its own for one button pushed the first group
      // down a screenful on a phone.
      actions={
        query.isSuccess &&
        draftGroups.length > 1 && (
          <ExpandAllButton
            allOpen={draftGroups.every((g) => draftsOpen.isOpen(g.key))}
            onChange={(open) =>
              draftsOpen.setAll(
                draftGroups.map((g) => g.key),
                open,
              )
            }
          />
        )
      }
    >
      {query.isPending && <ListSkeleton rows={4} />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && (
        <>
          <section aria-labelledby="pending-heading">
            {/* Tinted, unlike the neutral group bars below it: this is the
                section the send button acts on, and "select all" sits inside
                the bar because it selects this section and nothing else. */}
            <div className="mb-3 flex min-h-[3.25rem] items-center gap-3 rounded-control border border-primary/25 bg-primary-soft pe-1 ps-4">
              <h2
                id="pending-heading"
                className="flex min-w-0 flex-1 items-baseline gap-2 text-body font-semibold text-primary"
              >
                <span className="truncate">{t('pending')}</span>
                {drafts.length > 0 && (
                  <span className="tnum shrink-0 text-secondary font-medium text-primary/75">
                    {drafts.length}
                  </span>
                )}
              </h2>
              {drafts.length > 0 && (
                <Checkbox
                  className="pe-3 ps-1"
                  checked={allPicked}
                  indeterminate={picked.size > 0 && !allPicked}
                  onChange={toggleAll}
                  label={t('selectAll')}
                  labelClassName="text-primary"
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
                  <button type="button" onClick={() => navigate('/projects')} className="btn-primary">
                    <FolderOpen className="h-5 w-5" aria-hidden />
                    {t('goToProjects')}
                  </button>
                }
              />
            ) : (
              <>
                <div className="space-y-4">
                  {draftGroups.map((group) => {
                    const ids = group.entries.map((e) => e.line_id)
                    const pickedHere = ids.filter((id) => picked.has(id)).length
                    return (
                      <Collapsible
                        key={group.key}
                        open={draftsOpen.isOpen(group.key)}
                        onToggle={() => draftsOpen.toggle(group.key)}
                        title={<Bidi>{group.title}</Bidi>}
                        subtitle={group.subtitle && <Bidi>{group.subtitle}</Bidi>}
                        count={group.entries.length}
                        leading={
                          <Checkbox
                            checked={pickedHere === ids.length}
                            indeterminate={pickedHere > 0}
                            onChange={(checked) => togglePickedMany(ids, checked)}
                            srLabel={`${t('selectAll')}: ${group.subtitle || group.title}`}
                          />
                        }
                      >
                        <ul className="space-y-3">
                          {group.entries.map((entry) => (
                            <li key={entry.line_id}>
                              <EntryCard
                                entry={entry}
                                selectable
                                selected={picked.has(entry.line_id)}
                                onSelectChange={(checked) => togglePicked(entry.line_id, checked)}
                                onEdit={() => navigate(`/entries/${entry.line_id}/edit`)}
                                onDelete={() => setPendingDelete(entry)}
                              />
                            </li>
                          ))}
                        </ul>
                      </Collapsible>
                    )
                  })}
                </div>
              </>
            )}
          </section>

          {sent.length > 0 && (
            <Collapsible
              as="h2"
              size="section"
              className="mt-8"
              open={sentOpen.isOpen('all')}
              onToggle={() => sentOpen.toggle('all')}
              title={t('sent')}
              count={sent.length}
            >
              <div className="space-y-4">
                {sentGroups.map((group) => (
                  <Collapsible
                    key={group.key}
                    open={sentGroupsOpen.isOpen(group.key)}
                    onToggle={() => sentGroupsOpen.toggle(group.key)}
                    title={<Bidi>{group.title}</Bidi>}
                    subtitle={group.subtitle && <Bidi>{group.subtitle}</Bidi>}
                    count={group.entries.length}
                  >
                    <ul className="space-y-3">
                      {group.entries.map((entry) => (
                        <li key={entry.line_id}>
                          <EntryCard entry={entry} readOnly />
                        </li>
                      ))}
                    </ul>
                  </Collapsible>
                ))}
              </div>
            </Collapsible>
          )}

          {drafts.length > 0 && (
            <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border bg-bg/90 px-4 py-3 pb-safe backdrop-blur">
              <button
                type="button"
                onClick={() => setConfirming(true)}
                // Nothing ticked is not an error worth explaining in a sheet —
                // the checkboxes are right above the button.
                disabled={confirm.isPending || picked.size === 0}
                className="btn-accent w-full"
              >
                {confirm.isPending ? (
                  <>
                    <Spinner className="h-5 w-5" />
                    {t('confirmingEntries')}
                  </>
                ) : (
                  <>
                    <Send className="rtl-flip h-5 w-5" aria-hidden />
                    {allPicked ? t('confirmAll') : t('confirmSelected')}{' '}
                    <span className="tnum">({picked.size})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      <Sheet open={confirming} onClose={() => setConfirming(false)} title={t('confirmTitle')}>
        <div className="p-4">
          <p className="mb-4 text-secondary text-muted">{t('confirmBody')}</p>
          <button
            type="button"
            onClick={sendPicked}
            disabled={confirm.isPending || picked.size === 0}
            className="btn-accent w-full"
          >
            {confirm.isPending ? <Spinner className="h-5 w-5" /> : <Send className="rtl-flip h-5 w-5" aria-hidden />}
            {allPicked ? t('confirmAll') : t('confirmSelected')}{' '}
            <span className="tnum">({picked.size})</span>
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-ghost mt-2 w-full">
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
          <p className="mb-4 text-secondary text-muted">{t('deleteConfirmBody')}</p>
          <button
            type="button"
            onClick={() => discard(pendingDelete)}
            disabled={remove.isPending}
            className="btn-danger w-full"
          >
            {remove.isPending ? <Spinner className="h-5 w-5" /> : <Trash2 className="h-5 w-5" aria-hidden />}
            {t('deleteEntry')}
          </button>
          <button type="button" onClick={() => setPendingDelete(null)} className="btn-ghost mt-2 w-full">
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
