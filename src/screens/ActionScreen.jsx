import { useNavigate, useParams } from 'react-router-dom'
import { Camera, ChevronRight, Lock, PackageX } from 'lucide-react'
import Screen from '@/components/Screen'
import CloseTask from '@/components/CloseTask'
import SectionHeader from '@/components/SectionHeader'
import DateRange from '@/components/DateRange'
import { taskBadges } from '@/components/StatusBadge'
import {
  ENTRY_ORDER,
  ENTRY_TYPES,
  hasNothingToEnter,
  isTypeEmpty,
} from '@/api/entryTypes'
import { useSubtaskAvailability } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { isTaskClosed } from '@/lib/status'
import { rangeParts } from '@/lib/datetime'
import Bidi from '@/components/Bidi'
import CopyButton from '@/components/CopyButton'

/**
 * The hub an engineer returns to after every save.
 *
 * Standing at one spot they will log material, then plant hours, then a
 * photo — so this screen, not the project list, is the centre of gravity of
 * the whole app. The task's own card on top (what am I logging against?), then
 * four boxes, one tap each.
 *
 * A box whose type has no products set up on this sub-task is disabled here
 * rather than opening on an empty state. Most level-aware sub-tasks are costed
 * for labour alone, which the portal does not write, so without this the walk
 * ends in a dead end that looks like a fault in the app.
 */
export default function ActionScreen() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { trail } = useTrail()
  const availability = useSubtaskAvailability(taskId).data
  const available = availability?.available ?? null

  // Route params are strings, the trail records the numeric id it got from
  // JSON — compare as strings. The API's copy of the name covers a deep link
  // or a back-button return, where there is no trail to read it from.
  const fromTrail = String(trail.subtask?.taskId ?? '') === String(taskId) ? trail.subtask : null
  const subtaskName = fromTrail?.name || availability?.name || null
  // The server's state is the live one; the trail's is from the list the
  // engineer tapped through, and covers the moment before it arrives.
  const state = availability?.state || fromTrail?.state
  // A sub-task the office did not plan on its own runs on its work item's
  // dates — shown, but marked as borrowed.
  const own = Boolean(availability?.date_start || availability?.date_end)
  const plan = own ? availability : availability?.item
  const hasPlan = Boolean(plan?.date_start || plan?.date_end)
  const badges = taskBadges({ state, date_start: plan?.date_start, date_end: plan?.date_end }, t)
  const closed = isTaskClosed(state)
  const closedOn = closed ? rangeParts(availability?.closed_on, null, lang)?.from : null
  // Only on the server's word: the trail's copy of the state may predate a
  // close from another screen, and the button must not offer it twice.
  const canClose = Boolean(availability?.state) && !closed

  return (
    <Screen width="narrow">
      {subtaskName && (
        <section className="card mb-6 p-4" aria-label={t('subtask')}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-meta font-medium text-muted">{t('subtask')}</p>
              <h1 className="mt-1 break-words text-title font-semibold">
                <Bidi>{subtaskName}</Bidi>
              </h1>
            </div>
            {/* The hub is where the engineer stands longest, so it is the
                most likely place they need this name in hand. */}
            <CopyButton value={subtaskName} className="-me-2 -mt-2 shrink-0" />
          </div>
          {(hasPlan || closedOn) && (
            <dl className="mt-3 space-y-1 text-secondary">
              {hasPlan && (
                <div className="flex flex-wrap items-center gap-x-2">
                  <dt className="font-medium text-muted">{t('planned')}</dt>
                  <dd className="min-w-0">
                    <DateRange
                      start={plan.date_start}
                      end={plan.date_end}
                      withTime
                      inherited={!own}
                      prominent
                    />
                  </dd>
                </div>
              )}
              {closedOn && (
                <div className="flex flex-wrap items-center gap-x-2">
                  <dt className="font-medium text-muted">{t('closedOn')}</dt>
                  <dd className="tnum">{closedOn}</dd>
                </div>
              )}
            </dl>
          )}
          {badges.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{badges}</div>}
          {canClose && (
            <div className="mt-4 border-t border-border pt-3">
              <CloseTask taskId={taskId} />
            </div>
          )}
        </section>
      )}

      {/* A closed task keeps its camera: a photo of finished work is often the
          last thing logged against it. */}
      {closed && (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-border bg-surface-2 p-4">
          <Lock className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{t('closedTitle')}</p>
            <p className="mt-1 text-secondary text-muted">{t('closedBody')}</p>
          </div>
        </div>
      )}

      {/* Photos need no products, so this says "nothing to log", not
          "nothing to do" — the camera below stays live either way. */}
      {!closed && hasNothingToEnter(available) && (
        <div className="mb-6 flex items-start gap-3 rounded-card border border-border bg-surface-2 p-4">
          <PackageX className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold">{t('nothingToEnterTitle')}</p>
            <p className="mt-1 text-secondary text-muted">{t('nothingToEnterBody')}</p>
          </div>
        </div>
      )}

      <SectionHeader title={t('logWork')} as={subtaskName ? 'h2' : 'h1'} />

      <ul className="grid grid-cols-2 gap-3">
        {ENTRY_ORDER.map((key) => {
          const { icon: Icon } = ENTRY_TYPES[key]
          const empty = isTypeEmpty(available, key)
          return (
            <li key={key} className="min-w-0">
              <button
                type="button"
                disabled={empty || closed}
                onClick={() => navigate(`/subtasks/${taskId}/${key}`)}
                className="card flex h-full min-h-[8.5rem] w-full flex-col items-start gap-2 p-4 text-start
                           transition-colors hover:border-border-strong active:bg-surface-2
                           disabled:pointer-events-none disabled:opacity-45"
              >
                {/* Coloured because it is the one thing that tells the four
                    apart at a glance — the same green for all of them. */}
                <Icon className={`h-6 w-6 ${empty || closed ? 'text-muted' : 'text-primary'}`} aria-hidden />
                <span className="mt-auto block text-title font-semibold">{t(key)}</span>
                <span className="block text-secondary text-muted">
                  {empty ? t('typeNotSetUp') : t(`${key}Hint`)}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={() => navigate(`/subtasks/${taskId}/photo`)}
        className="card mt-3 flex min-h-tap w-full items-center gap-3 p-4 text-start
                   transition-colors hover:border-border-strong active:bg-surface-2"
      >
        <Camera className="h-6 w-6 shrink-0 text-muted" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t('photo')}</span>
          <span className="mt-1 block text-secondary text-muted">{t('photoHint')}</span>
        </span>
        <ChevronRight className="rtl-flip h-5 w-5 shrink-0 text-subtle" aria-hidden />
      </button>
    </Screen>
  )
}
