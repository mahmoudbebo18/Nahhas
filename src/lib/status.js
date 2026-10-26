import { addDays, parseUtc, startOfDay } from './datetime'

/**
 * Odoo states → what the portal shows for them.
 *
 * One table, so a state reads the same on every screen. `tone` is semantic and
 * deliberately sparing: colour means "this needs your attention" (warning) or
 * "this is finished" (success). Plain work in progress is the normal case and
 * gets no badge at all — a pill saying "open" on every box is noise.
 */

const TASK = {
  '01_in_progress': null,
  '04_waiting_normal': { key: 'statusWaiting', tone: 'neutral' },
  '02_changes_requested': { key: 'statusChangesRequested', tone: 'warning' },
  '03_approved': { key: 'statusApproved', tone: 'primary' },
  '1_done': { key: 'statusDone', tone: 'success' },
  '1_canceled': { key: 'statusCanceled', tone: 'neutral' },
}

/** `{ key, tone }` for a project.task state, or null when nothing is worth saying. */
export function taskStatus(state) {
  return TASK[state] ?? null
}

/** True once the task can no longer take entries. */
export function isTaskClosed(state) {
  return state === '1_done' || state === '1_canceled'
}

const PROJECT = {
  draft: { key: 'projectDraft', tone: 'neutral' },
  tender: { key: 'projectTender', tone: 'neutral' },
  contract: null, // the normal, working state
  done: { key: 'projectDone', tone: 'success' },
}

/** `{ key, tone }` for a project.project state, or null for the normal case. */
export function projectStatus(state) {
  return PROJECT[state] ?? null
}

/** How many days ahead a planned start still counts as "starting soon". */
const SOON_DAYS = 3

/**
 * Where an open task stands against the office's plan — `{ key, tone }`, or
 * null when it is simply under way (or has no plan, or is closed).
 *
 * Day-grained, as the "Today" list on the server is: a task due at 14:00 is
 * "due today" for the whole day, and only overdue from tomorrow. Being in the
 * middle of its range is the normal case and, like an open state, gets no
 * badge — the dates on the box already say it.
 */
export function scheduleStatus({ state, date_start: startValue, date_end: endValue } = {}, now = new Date()) {
  const end = parseUtc(endValue)
  if (!end || isTaskClosed(state)) return null
  const start = parseUtc(startValue)
  const today = startOfDay(now)
  const tomorrow = addDays(today, 1)

  if (end < today) return { key: 'schedOverdue', tone: 'danger' }
  if (end < tomorrow) return { key: 'schedDueToday', tone: 'warning' }
  if (start && start >= today && start < tomorrow) return { key: 'schedStartsToday', tone: 'primary' }
  if (start && start >= tomorrow && start < addDays(tomorrow, SOON_DAYS)) {
    return { key: 'schedStartsSoon', tone: 'neutral' }
  }
  return null
}
