import { addDays, parseUtc, startOfDay, weekStartFor } from './datetime'
import { isTaskClosed } from './status'

/**
 * The timeline's arithmetic, kept out of the screen so it can be read (and
 * checked) without React in the way.
 *
 * Everything is day-grained. The office plans in whole working days (08:00 to
 * 17:00 almost every time), so a bar runs from the start of its first day to
 * the end of its last; drawing the hours would only nudge every bar a third
 * of a column in from its gridlines. Days are counted on the calendar, not in
 * milliseconds, so a daylight-saving change can't shift a bar by an hour's
 * worth of pixels.
 */

/** Width of one day, per zoom. */
export const ZOOMS = {
  day: { pxPerDay: 36 },
  week: { pxPerDay: 14 },
  month: { pxPerDay: 4 },
}

export const LEVEL_ORDER = ['project', 'building', 'floor', 'unit', 'additional_unit']

const DAY_MS = 86400000
const utcDay = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())

/** Whole calendar days from `origin` to `d`. */
export const dayIndex = (d, origin) => Math.round((utcDay(d) - utcDay(origin)) / DAY_MS)

const intlLocale = (lang) => `${lang === 'ar' ? 'ar-EG' : 'en-GB'}-u-nu-latn`

/** A task's planned range as local days, `{ start, end }` (end inclusive), or null. */
export function taskDays(task) {
  const start = parseUtc(task?.date_start)
  const end = parseUtc(task?.date_end)
  if (!start && !end) return null
  // A deadline alone is a one-day bar on that day, as /tasks/today counts it.
  return { start: startOfDay(start ?? end), end: startOfDay(end ?? start) }
}

/**
 * Where a task stands, for its bar's colour and the status filter:
 * 'closed' (done or cancelled), 'overdue' (open past its last day), or 'open'.
 */
export function barTone(task, today) {
  if (isTaskClosed(task?.state)) return 'closed'
  const days = taskDays(task)
  if (days && days.end < today) return 'overdue'
  return 'open'
}

/** Days in one column of the fine header row, per zoom (a month on average). */
export const CELL_DAYS = { day: 1, week: 7, month: 365.25 / 12 }

/**
 * Width of a day, stretched from the zoom's nominal width so a whole number
 * of columns fills the visible track: no column is cut in half at either
 * edge. (At month zoom months differ by a day or two, so the far edge can be
 * off by under a pixel per month — not enough to see.)
 */
export function fitPxPerDay(zoom, viewport) {
  const nominal = ZOOMS[zoom].pxPerDay
  if (!(viewport > 0)) return nominal
  const cells = Math.max(1, Math.round(viewport / (nominal * CELL_DAYS[zoom])))
  return viewport / cells / CELL_DAYS[zoom]
}

/**
 * Day index ↔ pixel, for the visible track `viewport` px wide.
 *
 * Day and week zoom are linear, at a width stretched so whole columns fill
 * the view (`fitPxPerDay`). Month zoom is not: months run 28 to 31 days, so
 * at any one width per day the columns come out unequal and the view ends on
 * a sliver of the next month. There every month gets the same width instead,
 * and a day sits proportionally inside its own month.
 *
 * `days` is the range stretched, if need be, to at least fill the view, so a
 * short project never leaves a blank band past its last column.
 * `{ x(day), day(x), width, days }`.
 */
export function makeScale(origin, rangeDays, zoom, viewport) {
  if (zoom !== 'month') {
    const px = fitPxPerDay(zoom, viewport)
    const days = Math.max(rangeDays, Math.round(viewport / px))
    return { x: (d) => d * px, day: (x) => x / px, width: days * px, days }
  }

  const nominal = ZOOMS.month.pxPerDay * CELL_DAYS.month
  const cells = viewport > 0 ? Math.max(1, Math.round(viewport / nominal)) : 1
  const w = viewport > 0 ? viewport / cells : nominal
  // Month boundaries as day indexes. The origin is a month's first day here
  // (chartRange), so starts[0] is 0.
  const starts = []
  for (let m = 0; ; m += 1) {
    const start = dayIndex(new Date(origin.getFullYear(), origin.getMonth() + m, 1), origin)
    starts.push(start)
    if (start >= rangeDays && m >= cells) break
  }
  const months = starts.length - 1
  const monthOf = (d) => {
    let i = 0
    while (i < months - 1 && starts[i + 1] <= d) i += 1
    return i
  }
  return {
    x: (d) => {
      const i = monthOf(d)
      return (i + (d - starts[i]) / (starts[i + 1] - starts[i])) * w
    },
    day: (x) => {
      const i = Math.max(0, Math.min(months - 1, Math.floor(x / w)))
      return starts[i] + (x / w - i) * (starts[i + 1] - starts[i])
    },
    width: months * w,
    days: starts[months],
  }
}

/**
 * The span the chart draws: from the start of the earliest task's month to
 * the end of the latest's, and always today, so the "today" line is never
 * off the end. At week zoom both ends go out to whole weeks, so the first
 * and last columns are full weeks like the rest.
 */
export function chartRange(spans, today, zoom = 'day', lang = 'en') {
  let min = today
  let max = today
  for (const s of spans) {
    if (s.start < min) min = s.start
    if (s.end > max) max = s.end
  }
  let origin = new Date(min.getFullYear(), min.getMonth(), 1)
  let last = new Date(max.getFullYear(), max.getMonth() + 1, 0)
  if (zoom === 'week') {
    const weekStart = weekStartFor(lang)
    origin = addDays(origin, -((origin.getDay() - weekStart + 7) % 7))
    last = addDays(last, ((weekStart + 6) % 7 - last.getDay() + 7) % 7)
  }
  return { origin, days: dayIndex(last, origin) + 1 }
}

/** The fine-row column holding `day` (days from the origin), clamped to the chart. */
export function cellAt(cells, day) {
  let found = cells[0]
  for (const cell of cells) {
    if (cell.start > day) break
    found = cell
  }
  return found
}

/**
 * The two header rows: a coarse one (months, or years at month zoom) and a
 * fine one (days, weeks or months). Each cell is `{ key, start, span, label }`
 * in days from the origin.
 */
export function headerTiers(origin, days, zoom, lang) {
  const monthFmt = new Intl.DateTimeFormat(intlLocale(lang), {
    month: zoom === 'month' ? 'short' : 'long',
    ...(zoom === 'month' ? {} : { year: 'numeric' }),
  })
  const yearFmt = new Intl.DateTimeFormat(intlLocale(lang), { year: 'numeric' })
  const end = addDays(origin, days)

  const months = []
  for (let d = new Date(origin); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const start = dayIndex(d, origin)
    months.push({
      key: `m${d.getFullYear()}-${d.getMonth()}`,
      start,
      span: Math.min(dayIndex(next, origin), days) - start,
      label: monthFmt.format(d),
      date: d,
    })
  }

  if (zoom === 'month') {
    const years = []
    for (const m of months) {
      const y = m.date.getFullYear()
      const last = years[years.length - 1]
      if (last && last.year === y) last.span += m.span
      else years.push({ key: `y${y}`, year: y, start: m.start, span: m.span, label: yearFmt.format(m.date) })
    }
    return { coarse: years, fine: months }
  }

  if (zoom === 'week') {
    // Weeks start where the language's calendar does — Saturday in Arabic.
    const weekStart = weekStartFor(lang)
    const lead = (origin.getDay() - weekStart + 7) % 7
    const weeks = []
    for (let start = -lead; start < days; start += 7) {
      const from = Math.max(start, 0)
      const to = Math.min(start + 7, days)
      const date = addDays(origin, from)
      weeks.push({ key: `w${from}`, start: from, span: to - from, label: String(date.getDate()), date })
    }
    return { coarse: months, fine: weeks }
  }

  const daysRow = Array.from({ length: days }, (_, i) => {
    const date = addDays(origin, i)
    return { key: `d${i}`, start: i, span: 1, label: String(date.getDate()), date }
  })
  return { coarse: months, fine: daysRow }
}

/**
 * A sub-task's name without its work item's: Odoo names them
 * "TP0701-B02 / بند عمل 2", and on the row right under "TP0701-B02" the
 * prefix only pushes the part that differs out of sight.
 */
export function shortName(task, parent) {
  const name = task?.name ?? ''
  const prefix = parent?.name ? `${parent.name} / ` : null
  return prefix && name.startsWith(prefix) && name.length > prefix.length
    ? name.slice(prefix.length)
    : name
}

const nameCompare = (a, b) =>
  String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { numeric: true })

/**
 * The project's tasks as the chart's groups.
 *
 * A level-aware project groups its work items by level, then building — the
 * same order as the walk. A legacy project is one group of root tasks. Under
 * each root sit all its descendants (`depth` says how far down), so a deeper
 * legacy tree still shows everything.
 *
 * A root is "scheduled" when it or anything under it has dates; one with
 * nothing dated anywhere goes to `unscheduled`. A root without dates of its
 * own takes the span of its dated descendants (`derived`).
 */
export function buildTree(tasks, levelAware, t) {
  const byParent = new Map()
  for (const task of tasks) {
    const key = task.parent_id || 0
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(task)
  }
  const descendants = (task, depth = 1, out = []) => {
    for (const child of (byParent.get(task.id) ?? []).sort((a, b) => a.id - b.id)) {
      out.push({ task: child, depth, days: taskDays(child) })
      descendants(child, depth + 1, out)
    }
    return out
  }

  const groups = new Map()
  const unscheduled = []
  for (const root of byParent.get(0) ?? []) {
    const children = descendants(root)
    const own = taskDays(root)
    const dated = children.filter((c) => c.days)
    if (!own && dated.length === 0) {
      unscheduled.push({ task: root, childCount: children.length })
      continue
    }
    const first = dated.reduce((a, c) => (!a || c.days.start < a.days.start ? c : a), null)
    const last = dated.reduce((a, c) => (!a || c.days.end > a.days.end ? c : a), null)
    const days = own ?? { start: first.days.start, end: last.days.end }
    // The API's own values, for the details sheet's DateRange.
    const range = own
      ? { start: root.date_start, end: root.date_end }
      : { start: first.task.date_start || first.task.date_end, end: last.task.date_end || last.task.date_start }

    const level = levelAware ? root.level || null : null
    const key = levelAware ? `${level ?? '-'}:${root.building_id || 0}` : 'all'
    if (!groups.has(key)) {
      const levelLabel = level ? t(`level_${level}`, level) : null
      groups.set(key, {
        key,
        level,
        building: root.building || null,
        label: [levelLabel, root.building].filter(Boolean),
        items: [],
      })
    }
    groups.get(key).items.push({ task: root, days, range, derived: !own, children })
  }

  const levelRank = (g) => {
    const i = LEVEL_ORDER.indexOf(g.level)
    return i === -1 ? LEVEL_ORDER.length : i
  }
  const sorted = [...groups.values()].sort(
    (a, b) =>
      levelRank(a) - levelRank(b) ||
      String(a.building ?? '').localeCompare(String(b.building ?? ''), undefined, { numeric: true }),
  )
  for (const group of sorted) {
    group.items.sort(
      (a, b) =>
        (a.task.floor_no === false ? -1 : a.task.floor_no) -
          (b.task.floor_no === false ? -1 : b.task.floor_no) || nameCompare(a.task, b.task),
    )
  }
  unscheduled.sort((a, b) => nameCompare(a.task, b.task))
  return { groups: sorted, unscheduled }
}

/** Does a task pass the status filter ('all' | 'open' | 'overdue')? */
export function matchesStatus(task, status, today) {
  if (status === 'all') return true
  const tone = barTone(task, today)
  return status === 'open' ? tone !== 'closed' : tone === 'overdue'
}

/**
 * The rows actually drawn, top to bottom, after the filters and the
 * expanded/collapsed state: group headings, work items, and the sub-tasks of
 * the open ones. A work item stays when it or any of its sub-tasks matches
 * the status filter, and then shows only the matching sub-tasks.
 */
export function visibleRows(tree, { status, group, isOpen, today }) {
  const rows = []
  const showHeadings = tree.groups.length > 1 || Boolean(tree.groups[0]?.label.length)
  for (const g of tree.groups) {
    if (group !== 'all' && g.key !== group) continue
    const items = []
    for (const item of g.items) {
      const children =
        status === 'all' ? item.children : item.children.filter((c) => matchesStatus(c.task, status, today))
      if (status !== 'all' && children.length === 0 && !matchesStatus(item.task, status, today)) continue
      items.push({ ...item, children })
    }
    if (items.length === 0) continue
    if (showHeadings) rows.push({ type: 'group', key: `g:${g.key}`, group: g, count: items.length })
    for (const item of items) {
      const open = item.children.length > 0 && isOpen(item.task.id)
      rows.push({ type: 'item', key: `t:${item.task.id}`, item, open })
      if (open) {
        for (const child of item.children) {
          rows.push({ type: 'child', key: `t:${child.task.id}`, child, parent: item.task })
        }
      }
    }
  }
  return rows
}
