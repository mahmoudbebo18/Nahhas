import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useParams } from 'react-router-dom'
import { CalendarOff, ChartGantt, ChevronDown, ChevronRight, Layers, LocateFixed } from 'lucide-react'
import Screen from '@/components/Screen'
import Bidi from '@/components/Bidi'
import Sheet from '@/components/Sheet'
import Segmented from '@/components/Segmented'
import SelectMenu from '@/components/SelectMenu'
import DateRange from '@/components/DateRange'
import Tile, { TileGrid } from '@/components/Tile'
import Collapsible, { ExpandAllButton } from '@/components/Collapsible'
import { taskBadges } from '@/components/StatusBadge'
import { EmptyState, ErrorState } from '@/components/states'
import { useTimeline } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { useEnsureProjectCrumb } from '@/hooks/useCrumbs'
import { useCollapsed } from '@/hooks/useCollapsed'
import { useIsWide } from '@/hooks/useIsWide'
import { useOpenTask } from '@/hooks/useOpenTask'
import { rangeParts, startOfDay, parseUtc } from '@/lib/datetime'
import { isTaskClosed } from '@/lib/status'
import { KEYS, readStored, writeStored } from '@/lib/storage'
import {
  barTone,
  buildTree,
  cellAt,
  chartRange,
  dayIndex,
  makeScale,
  headerTiers,
  shortName,
  visibleRows,
} from '@/lib/timeline'

/**
 * GET /projects/<id>/timeline — the project's plan as a Gantt chart.
 *
 * Built here rather than taken from a library: the ones that handle
 * right-to-left properly are heavy and mostly commercial, and the light ones
 * don't. Everything is plain elements positioned with logical properties
 * (`inset-inline-start`), so under `dir="rtl"` time runs right to left and the
 * name column sits on the right with no code of its own for it — the same
 * rule the rest of the app follows. Text stays text: selectable, readable by
 * a screen reader, and sharp at any zoom.
 *
 * Rows are fixed-height so only those in view are rendered: a large project
 * runs to several hundred, and a phone scrolling that many absolutely
 * positioned bars stutters.
 */

const ROW_H = 44
const TIER_H = { coarse: 24, fine: 32 }
const HEADER_H = TIER_H.coarse + TIER_H.fine
const OVERSCAN = 8
const ZOOM_KEYS = ['day', 'week', 'month']

export default function TimelineScreen() {
  const { projectId } = useParams()
  const { t, lang, isRtl } = useI18n()
  const { clearFrom } = useTrail()
  const project = useEnsureProjectCrumb(projectId)
  const query = useTimeline(projectId)
  const openTask = useOpenTask()
  const wide = useIsWide()

  const [zoom, setZoomState] = useState(() => {
    const stored = readStored(KEYS.timelineZoom)
    return ZOOM_KEYS.includes(stored) ? stored : 'week'
  })
  const [status, setStatus] = useState('all')
  const [group, setGroup] = useState('all')
  const [selected, setSelected] = useState(null)
  const expanded = useCollapsed(`timeline:${projectId}`, false)
  const unscheduledOpen = useCollapsed(`timeline:${projectId}:unscheduled`, false)

  useEffect(() => {
    clearFrom('level')
  }, [projectId, clearFrom])

  const today = useMemo(() => startOfDay(new Date()), [])
  const data = query.data
  const tree = useMemo(
    () => buildTree(data?.tasks ?? [], Boolean(data?.level_aware), t),
    [data, t],
  )
  // The range covers every dated task, not just the filtered ones, so
  // changing a filter never moves the dates under the engineer's eye.
  const range = useMemo(() => {
    const spans = tree.groups.flatMap((g) =>
      g.items.flatMap((item) => [item.days, ...item.children.map((c) => c.days).filter(Boolean)]),
    )
    return chartRange(spans, today, zoom, lang)
  }, [tree, today, zoom, lang])

  const rows = visibleRows(tree, { status, group, isOpen: expanded.isOpen, today })
  const expandable = tree.groups.flatMap((g) =>
    g.items.filter((item) => item.children.length > 0).map((item) => item.task.id),
  )
  const groupOptions = tree.groups.filter((g) => g.label.length > 0)
  // A building sits under its level's heading; a level with no buildings
  // (the project itself) is an option on its own.
  const groupMenu = [
    {
      value: 'all',
      label: t('allGroups'),
      text: t('allGroups'),
      count: tree.groups.reduce((n, g) => n + g.items.length, 0),
    },
    ...groupOptions.map((g) => {
      const [levelLabel, building] = g.building ? g.label : [null, g.label[0]]
      return {
        value: g.key,
        label: <Bidi>{building}</Bidi>,
        text: g.label.join(' – '),
        group: levelLabel ?? undefined,
        count: g.items.length,
      }
    }),
  ]
  const selectedGroup = groupOptions.find((g) => g.key === group)

  // A filter that hid the group it pointed at (a refetch dropped it) falls
  // back to everything rather than showing an empty chart.
  useEffect(() => {
    if (group !== 'all' && !tree.groups.some((g) => g.key === group)) setGroup('all')
  }, [group, tree])

  const chart = useRef(null)
  function setZoom(next) {
    chart.current?.keepCentre()
    setZoomState(next)
    writeStored(KEYS.timelineZoom, next)
  }

  const scheduled = tree.groups.length > 0
  const hasAny = scheduled || tree.unscheduled.length > 0

  return (
    <Screen
      title={t('timeline')}
      meta={project?.name ? <Bidi>{project.name}</Bidi> : undefined}
      actions={
        scheduled && expandable.length > 0 ? (
          <ExpandAllButton
            allOpen={expandable.every((id) => expanded.isOpen(id))}
            onChange={(open) => expanded.setAll(expandable, open)}
          />
        ) : undefined
      }
    >
      {query.isPending && <ChartSkeleton />}

      {query.isError && <ErrorState error={query.error} onRetry={query.refetch} />}

      {query.isSuccess && !hasAny && <EmptyState icon={ChartGantt} title={t('emptyTasks')} />}

      {query.isSuccess && hasAny && !scheduled && (
        <EmptyState icon={CalendarOff} title={t('noSchedule')} body={t('noScheduleBody')} />
      )}

      {scheduled && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Segmented
              label={t('zoomLabel')}
              value={zoom}
              onChange={setZoom}
              options={ZOOM_KEYS.map((z) => ({ value: z, label: t(`zoom_${z}`) }))}
            />
            <button
              type="button"
              onClick={() => chart.current?.scrollToToday(true)}
              className="btn-outline min-h-touch px-3 text-secondary"
            >
              <LocateFixed className="h-4 w-4 text-muted" aria-hidden />
              {t('goToday')}
            </button>
            <div className="hidden flex-1 sm:block" />
            <Segmented
              label={t('filterStatus')}
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: t('filterAll') },
                { value: 'open', label: t('filterOpen') },
                { value: 'overdue', label: t('filterOverdue') },
              ]}
            />
            {groupOptions.length > 1 && (
              <SelectMenu
                label={t('filterGroup')}
                icon={Layers}
                value={group}
                onChange={setGroup}
                options={groupMenu}
                display={<GroupName parts={selectedGroup?.label ?? [t('allGroups')]} />}
                className="min-w-[11rem] max-w-full"
              />
            )}
          </div>

          <Chart
            ref={chart}
            rows={rows}
            range={range}
            zoom={zoom}
            today={today}
            lang={lang}
            isRtl={isRtl}
            nameWidth={wide ? 248 : 148}
            onToggle={(id) => expanded.toggle(id)}
            onSelect={setSelected}
            t={t}
          />

          <Legend t={t} />
        </>
      )}

      {tree.unscheduled.length > 0 && (
        <Collapsible
          as="h2"
          size="section"
          className="mt-6"
          open={unscheduledOpen.isOpen('all')}
          onToggle={() => unscheduledOpen.toggle('all')}
          title={t('unscheduled')}
          count={tree.unscheduled.length}
        >
          <TileGrid>
            {tree.unscheduled.map(({ task, childCount }) => (
              <Tile
                key={task.id}
                title={task.name}
                subtitle={task.building ? <Bidi>{task.building}</Bidi> : undefined}
                meta={[childCount > 0 ? `${childCount} ${t('subtaskCount')}` : null]}
                badges={taskBadges(task, t)}
                onClick={() => openTask(task)}
              />
            ))}
          </TileGrid>
        </Collapsible>
      )}

      <TaskSheet selection={selected} onClose={() => setSelected(null)} onOpen={openTask} t={t} />
    </Screen>
  )
}

/** "Floor › Park View 1", each part isolated so a Latin name can't reorder it. */
function GroupName({ parts }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight className="rtl-flip h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />}
          <Bidi className={i < parts.length - 1 ? 'shrink-0 text-muted' : 'truncate'}>{part}</Bidi>
        </Fragment>
      ))}
    </span>
  )
}

/* -- the chart ------------------------------------------------------------- */


const Chart = forwardRef(function Chart(
  { rows, range, zoom, today, lang, isRtl, nameWidth, onToggle, onSelect, t },
  ref,
) {
  const scroller = useRef(null)
  const [view, setView] = useState({ top: 0, height: 600, width: 0 })
  const frame = useRef(0)
  const pendingAnchor = useRef(null)
  const scrolledOnce = useRef(false)
  // The day at the start edge, so a resize (a phone turned sideways) keeps
  // the same dates in view while the columns re-fit. Kept, like the zoom
  // anchor, in days from today: a new zoom moves the chart's origin.
  const startDay = useRef(null)

  const viewport = Math.max(0, view.width - nameWidth)
  const { origin } = range
  const scale = useMemo(
    () => makeScale(origin, range.days, zoom, viewport),
    [origin, range.days, zoom, viewport],
  )
  const { days } = scale
  const trackWidth = scale.width
  const todayIdx = dayIndex(today, origin)
  const tiers = useMemo(() => headerTiers(origin, days, zoom, lang), [origin, days, zoom, lang])
  const bodyHeight = rows.length * ROW_H

  const sign = isRtl ? -1 : 1

  /**
   * Scroll so `day` sits about `fraction` of the way across the track, with
   * the start edge snapped back to a column boundary, so the view always
   * opens on whole days, weeks or months. If the snap would push `day` out of
   * view (a track only a column or two wide), its own column leads instead.
   */
  const scrollToDay = useCallback(
    (day, fraction, smooth) => {
      const el = scroller.current
      if (!el || !(viewport > 0)) return
      let cell = cellAt(tiers.fine, scale.day(scale.x(day) - viewport * fraction))
      if (scale.x(day) - scale.x(cell.start) >= viewport) cell = cellAt(tiers.fine, day)
      const x = Math.max(0, Math.min(trackWidth - viewport, scale.x(cell.start)))
      startDay.current = scale.day(x) - todayIdx
      el.scrollTo({ left: sign * x, behavior: smooth ? 'smooth' : 'auto' })
    },
    [viewport, scale, tiers, trackWidth, sign, todayIdx],
  )

  useImperativeHandle(ref, () => ({
    // Today about a third of the way in: what is coming matters more on site
    // than what is behind.
    scrollToToday: (smooth) => scrollToDay(todayIdx + 0.5, 1 / 3, smooth),
    // Remember what the engineer is looking at, so a change of zoom lands on
    // the same dates instead of jumping: today where it was on screen, if it
    // was on screen at all, otherwise the day in the middle of the view.
    keepCentre: () => {
      const el = scroller.current
      if (!el || !(viewport > 0)) return
      const scrolled = Math.abs(el.scrollLeft)
      const todayAt = (scale.x(todayIdx + 0.5) - scrolled) / viewport
      pendingAnchor.current =
        todayAt >= 0 && todayAt <= 1
          ? { day: 0.5, fraction: todayAt }
          : { day: scale.day(scrolled + viewport / 2) - todayIdx, fraction: 1 / 2 }
    },
  }))

  // Measured before the scroll below runs, so the first scroll already knows
  // the real column width.
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () =>
      setView({ top: el.scrollTop, height: el.clientHeight, width: el.clientWidth })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Runs when the columns change width — a new zoom or a resize — and not on
  // every scroll.
  useLayoutEffect(() => {
    if (!(viewport > 0)) return
    if (pendingAnchor.current) {
      scrollToDay(todayIdx + pendingAnchor.current.day, pendingAnchor.current.fraction, false)
      pendingAnchor.current = null
    } else if (!scrolledOnce.current) {
      scrollToDay(todayIdx + 0.5, 1 / 3, false)
      scrolledOnce.current = true
    } else if (startDay.current != null) {
      scrollToDay(todayIdx + startDay.current + 0.01, 0, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  function onScroll() {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const el = scroller.current
      if (!el) return
      startDay.current = scale.day(Math.abs(el.scrollLeft)) - todayIdx
      setView({ top: el.scrollTop, height: el.clientHeight, width: el.clientWidth })
    })
  }

  const first = Math.max(0, Math.floor((view.top - HEADER_H) / ROW_H) - OVERSCAN)
  const last = Math.min(rows.length, Math.ceil((view.top + view.height - HEADER_H) / ROW_H) + OVERSCAN)
  const todayX = nameWidth + scale.x(todayIdx + 0.5)

  return (
    <div
      ref={scroller}
      onScroll={onScroll}
      className="theme-tint relative overflow-auto overscroll-x-contain rounded-card border border-border bg-surface"
      style={{
        height: HEADER_H + bodyHeight + 2,
        maxHeight: 'calc(100dvh - 12rem)',
        minHeight: Math.min(HEADER_H + bodyHeight + 2, 18 * 16),
      }}
    >
      <div className="relative" style={{ width: nameWidth + trackWidth }}>
        <ChartHeader
          tiers={tiers}
          scale={scale}
          zoom={zoom}
          nameWidth={nameWidth}
          trackWidth={trackWidth}
          todayIdx={todayIdx}
          t={t}
        />

        <div className="relative" style={{ height: Math.max(bodyHeight, ROW_H) }}>
          <Gridlines tiers={tiers} scale={scale} zoom={zoom} nameWidth={nameWidth} />

          {rows.length === 0 && (
            <p
              className="sticky px-4 text-secondary text-muted"
              style={{ insetInlineStart: 0, lineHeight: `${ROW_H}px`, width: 'max-content' }}
            >
              {t('noTimelineMatch')}
            </p>
          )}

          {rows.slice(first, last).map((row, i) => (
            <Row
              key={row.key}
              row={row}
              top={(first + i) * ROW_H}
              origin={origin}
              scale={scale}
              today={today}
              todayIdx={todayIdx}
              lang={lang}
              nameWidth={nameWidth}
              trackWidth={trackWidth}
              onToggle={onToggle}
              onSelect={onSelect}
              t={t}
            />
          ))}

          {/* Over the rows but under the sticky name column. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 z-[5] w-0.5 -translate-x-1/2 bg-accent rtl:translate-x-1/2"
            style={{ insetInlineStart: todayX }}
          />
        </div>
      </div>
    </div>
  )
})

function ChartHeader({ tiers, scale, zoom, nameWidth, trackWidth, todayIdx, t }) {
  const place = (cell) => ({
    insetInlineStart: scale.x(cell.start),
    width: scale.x(cell.start + cell.span) - scale.x(cell.start),
  })
  return (
    <div className="sticky top-0 z-20 flex border-b border-border bg-surface" style={{ height: HEADER_H }}>
      <div
        className="sticky z-10 flex shrink-0 items-end border-e border-border bg-surface px-3 pb-2 text-meta font-semibold text-muted"
        style={{ insetInlineStart: 0, width: nameWidth }}
      >
        {t('timelineTask')}
      </div>
      <div className="relative shrink-0" style={{ width: trackWidth }}>
        {tiers.coarse.map((cell) => (
          <div
            key={cell.key}
            className="absolute top-0 border-b border-s border-border"
            style={{ ...place(cell), height: TIER_H.coarse }}
          >
            {/* Sticky inside its own cell: the month name stays in view while
                any of that month is. */}
            {/* A few days of a month at the edge of the range get the line,
                not a name cut off halfway through. */}
            {place(cell).width >= 64 && (
              <span
                className="sticky block w-max px-2 text-meta font-semibold leading-6 text-text"
                style={{ insetInlineStart: nameWidth }}
              >
                {cell.label}
              </span>
            )}
          </div>
        ))}
        {tiers.fine.map((cell) => {
          // The day, week or month that holds today carries the mark.
          const isToday = todayIdx >= cell.start && todayIdx < cell.start + cell.span
          const narrow = place(cell).width < 28
          return (
            <div
              key={cell.key}
              className={`tnum absolute flex items-center justify-center border-s border-border text-meta ${
                zoom === 'day' && cell.date.getDay() === 5 ? 'bg-surface-2' : ''
              }`}
              style={{
                ...place(cell),
                top: TIER_H.coarse,
                height: TIER_H.fine,
              }}
            >
              {!narrow && (
                <span
                  className={
                    isToday
                      ? 'flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 font-semibold text-accent-fg'
                      : 'text-muted'
                  }
                >
                  {cell.label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Column lines, heavier at month starts; Fridays shaded at day zoom. */
function Gridlines({ tiers, scale, zoom, nameWidth }) {
  const monthStarts = new Set(tiers.coarse.map((c) => c.start))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0" style={{ insetInlineStart: nameWidth }}>
      {tiers.fine.map((cell) => (
        <div
          key={cell.key}
          className={`absolute inset-y-0 border-s ${
            zoom !== 'month' && monthStarts.has(cell.start) ? 'border-border-strong' : 'border-border/70'
          } ${zoom === 'day' && cell.date.getDay() === 5 ? 'bg-surface-2/70' : ''}`}
          style={{
            insetInlineStart: scale.x(cell.start),
            width: scale.x(cell.start + cell.span) - scale.x(cell.start),
          }}
        />
      ))}
    </div>
  )
}

function Row({ row, top, origin, scale, today, todayIdx, lang, nameWidth, trackWidth, onToggle, onSelect, t }) {
  const style = { top, height: ROW_H, width: nameWidth + trackWidth, insetInlineStart: 0 }

  if (row.type === 'group') {
    return (
      <div className="absolute flex border-b border-border bg-surface-2" style={style}>
        <h3
          className="sticky flex items-center gap-1 whitespace-nowrap px-3 text-secondary font-semibold"
          style={{ insetInlineStart: 0 }}
        >
          {row.group.label.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="rtl-flip h-3.5 w-3.5 text-muted" aria-hidden />}
              <Bidi>{part}</Bidi>
            </span>
          ))}
          <span className="tnum ms-1 font-medium text-muted">({row.count})</span>
        </h3>
      </div>
    )
  }

  const isItem = row.type === 'item'
  const task = isItem ? row.item.task : row.child.task
  const days = isItem ? row.item.days : row.child.days
  const name = isItem ? task.name : shortName(task, row.parent)
  const childCount = isItem ? row.item.children.length : 0
  const select = () =>
    onSelect(
      isItem
        ? { task, range: row.item.range, derived: row.item.derived, childCount }
        : { task, range: { start: task.date_start, end: task.date_end } },
    )

  return (
    <div className={`absolute flex border-b border-border/70 ${isItem ? '' : 'bg-bg/40'}`} style={style}>
      <div
        className="sticky z-10 flex shrink-0 items-stretch border-e border-border bg-surface"
        style={{ insetInlineStart: 0, width: nameWidth }}
      >
        <button
          type="button"
          onClick={isItem && childCount > 0 ? () => onToggle(task.id) : select}
          aria-expanded={isItem && childCount > 0 ? row.open : undefined}
          className="flex min-w-0 flex-1 items-center gap-1 pe-2 text-start hover:bg-surface-2 focus-visible:ring-inset focus-visible:ring-offset-0"
          style={{ paddingInlineStart: isItem ? 4 : 12 + (row.child.depth - 1) * 12 }}
        >
          {isItem &&
            (childCount > 0 ? (
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${
                  row.open ? '' : '-rotate-90 rtl:rotate-90'
                }`}
                aria-hidden
              />
            ) : (
              <span className="w-4 shrink-0" />
            ))}
          <span
            className={`line-clamp-2 min-w-0 break-words text-meta leading-4 ${
              isItem ? 'font-semibold text-text' : 'text-muted'
            }`}
          >
            <Bidi>{name}</Bidi>
            {isItem && childCount > 0 && (
              <span className="tnum ms-1 font-normal text-muted">({childCount})</span>
            )}
          </span>
        </button>
      </div>

      <div className="relative shrink-0" style={{ width: trackWidth }}>
        {days ? (
          <Bar
            task={task}
            days={days}
            kind={isItem ? 'item' : 'child'}
            derived={isItem && row.item.derived}
            origin={origin}
            scale={scale}
            today={today}
            todayIdx={todayIdx}
            lang={lang}
            name={name}
            onClick={select}
            t={t}
          />
        ) : (
          <span
            className="sticky flex h-full w-max items-center px-3 text-meta text-subtle"
            style={{ insetInlineStart: nameWidth }}
          >
            {t('noDates')}
          </span>
        )}
      </div>
    </div>
  )
}

const TONE_FILL = {
  open: 'bg-primary',
  overdue: 'bg-danger',
  closed: 'bg-border-strong',
}
const TONE_OUTLINE = {
  open: 'border-primary',
  overdue: 'border-danger',
  closed: 'border-border-strong',
}
const TONE_LABEL = { open: 'filterOpen', overdue: 'schedOverdue', closed: 'statusClosed' }

/**
 * One bar. The button is the full row height so it is a 44px target however
 * thin the bar drawn inside it; a work item's bar is thinner than its
 * sub-tasks' so the two read as summary and detail. An overdue bar carries
 * on past its planned end up to today, hatched — how late it is, drawn.
 */
function Bar({ task, days, kind, derived, origin, scale, today, todayIdx, lang, name, onClick, t }) {
  const tone = barTone(task, today)
  const start = dayIndex(days.start, origin)
  const span = dayIndex(days.end, origin) - start + 1
  const late = tone === 'overdue' ? Math.max(0, todayIdx - (start + span) + 1) : 0
  const x = scale.x(start)
  const plannedWidth = scale.x(start + span) - x
  const lateWidth = late ? scale.x(start + span + late) - scale.x(start + span) : 0
  const parts = rangeParts(task.date_start || task.date_end, task.date_end || task.date_start, lang)
  const spoken = parts
    ? parts.sameDay || !parts.to
      ? parts.from
      : `${t('rangeFrom')} ${parts.from} ${t('rangeTo')} ${parts.to}`
    : ''
  const label = [name, spoken, t(TONE_LABEL[tone])].filter(Boolean).join('، ')

  const thickness = kind === 'item' ? 'h-2.5 rounded-[3px]' : 'h-5 rounded-badge'
  const fill = derived
    ? `border-2 border-dashed bg-transparent ${TONE_OUTLINE[tone]}`
    : TONE_FILL[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group absolute inset-y-0 flex items-center focus-visible:ring-inset focus-visible:ring-offset-0"
      style={{ insetInlineStart: x, width: Math.max(plannedWidth + lateWidth, 12) }}
    >
      <span
        className={`${thickness} ${fill} block shrink-0 transition-opacity group-hover:opacity-85`}
        style={{ width: Math.max(plannedWidth, late ? 0 : 12) }}
      />
      {late > 0 && (
        <span
          className={`${thickness} block shrink-0 border border-danger/50`}
          style={{
            width: lateWidth,
            marginInlineStart: -1,
            backgroundImage:
              'repeating-linear-gradient(135deg, rgb(var(--c-danger) / 0.32) 0 3px, transparent 3px 7px)',
          }}
        />
      )}
    </button>
  )
}

function Legend({ t }) {
  const items = [
    { key: 'open', className: 'bg-primary', label: t('filterOpen') },
    { key: 'overdue', className: 'bg-danger', label: t('schedOverdue') },
    { key: 'closed', className: 'bg-border-strong', label: t('statusClosed') },
  ]
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-muted">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5">
          <span className={`h-3 w-5 rounded-[3px] ${item.className}`} aria-hidden />
          {item.label}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span
          className="h-3 w-5 rounded-[3px] border border-danger/50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgb(var(--c-danger) / 0.32) 0 3px, transparent 3px 7px)',
          }}
          aria-hidden
        />
        {t('legendLate')}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-[3px] border-2 border-dashed border-primary" aria-hidden />
        {t('legendDerived')}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-accent" aria-hidden />
        {t('goToday')}
      </li>
    </ul>
  )
}

/** What a bar says when pressed, and the way into its task. */
function TaskSheet({ selection, onClose, onOpen, t }) {
  // Kept through the closing animation, so the sheet doesn't empty as it leaves.
  const last = useRef(selection)
  if (selection) last.current = selection
  const shown = selection ?? last.current
  const task = shown?.task
  const closedOn = task && isTaskClosed(task.state) ? parseUtc(task.closed_on) : null

  return (
    <Sheet
      open={Boolean(selection)}
      onClose={onClose}
      title={task?.name ?? ''}
      footer={
        task && (
          <button type="button" className="btn-primary w-full" onClick={() => onOpen(task)}>
            {task.is_leaf ? t('openTask') : t('openItem')}
          </button>
        )
      }
    >
      {task && (
        <div className="space-y-3 p-4">
          {(task.building || (task.is_leaf && task.item)) && (
            <p className="text-secondary text-muted">
              {[task.building, task.is_leaf ? task.item : null].filter(Boolean).map((part, i) => (
                <span key={i}>
                  {i > 0 && (
                    <ChevronRight className="rtl-flip mx-0.5 inline h-3.5 w-3.5 align-[-0.125em]" aria-hidden />
                  )}
                  <Bidi>{part}</Bidi>
                </span>
              ))}
            </p>
          )}
          <div>
            <DateRange start={shown.range?.start} end={shown.range?.end} withTime prominent />
            {shown.derived && <p className="mt-1 text-meta text-muted">{t('fromSubtasks')}</p>}
          </div>
          {(() => {
            const badges = taskBadges(task, t)
            return badges.length > 0 ? <div className="flex flex-wrap gap-2">{badges}</div> : null
          })()}
          {closedOn && (
            <p className="text-secondary text-muted">
              {t('closedOn')}{' '}
              <DateRange start={task.closed_on} end={task.closed_on} />
            </p>
          )}
          {shown.childCount > 0 && (
            <p className="tnum text-secondary text-muted">
              {shown.childCount} {t('subtaskCount')}
            </p>
          )}
        </div>
      )}
    </Sheet>
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex gap-2">
        <div className="h-touch w-44 rounded-control bg-surface-2" />
        <div className="h-touch w-24 rounded-control bg-surface-2" />
      </div>
      <div className="relative h-80 overflow-hidden rounded-card border border-border bg-surface">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-3 border-b border-border/70 px-3">
            <div className="h-3 w-24 shrink-0 rounded bg-surface-2" />
            <div
              className="h-4 rounded-badge bg-surface-2"
              style={{ marginInlineStart: `${10 + ((i * 37) % 50)}%`, width: `${12 + ((i * 23) % 20)}%` }}
            />
          </div>
        ))}
        <div className="shimmer-sweep absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
      </div>
    </div>
  )
}
