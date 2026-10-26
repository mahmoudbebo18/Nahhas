import { ChevronRight } from 'lucide-react'
import Tile, { TileGrid } from '@/components/Tile'
import Collapsible from '@/components/Collapsible'
import DateRange from '@/components/DateRange'
import Bidi from '@/components/Bidi'
import { taskBadges } from '@/components/StatusBadge'
import { useTodayTasks } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useCollapsed } from '@/hooks/useCollapsed'
import { useOpenTask } from '@/hooks/useOpenTask'

/**
 * The top of a project's screen: what the office planned for today in this
 * project, then what has slipped past its deadline. Both come from
 * GET /tasks/today, filtered to the project — inside it rather than on the
 * home screen, so an engineer on several sites never sees one site's day
 * mixed into another's.
 *
 * Nothing renders until there is something to say — no skeleton, no error, no
 * empty box. The levels (or task tree) below are the screen's real job, and
 * most projects carry no planned dates yet; a permanent "nothing today" panel
 * above them would be a box to scroll past on every visit.
 *
 * Both start folded, as two bars with their counts: the levels below are
 * what most visits to a project are for, and the counts already say whether
 * there is anything to open.
 */
export default function TodayTasks({ projectId }) {
  const { t } = useI18n()
  const open = useOpenTask()
  const query = useTodayTasks(projectId)
  const today = useCollapsed(`project:${projectId}:today`, false)
  const late = useCollapsed(`project:${projectId}:overdue`, false)

  if (!query.isSuccess) return null
  const tasks = query.data?.tasks ?? []
  const overdue = query.data?.overdue ?? []
  const overdueCount = query.data?.overdue_count ?? overdue.length
  if (tasks.length === 0 && overdueCount === 0) return null

  const grid = (list) => (
    <TileGrid>
      {list.map((task) => (
        <Tile
          key={task.id}
          title={task.name}
          subtitle={<Where task={task} />}
          dates={<DateRange start={task.date_start} end={task.date_end} />}
          badges={taskBadges(task, t)}
          copyText={task.name}
          onClick={() => open(task)}
        />
      ))}
    </TileGrid>
  )

  return (
    <div className="mb-6 space-y-3">
      <Collapsible
        as="h2"
        size="section"
        open={today.isOpen('all')}
        onToggle={() => today.toggle('all')}
        title={t('todayTasks')}
        count={tasks.length}
      >
        {tasks.length > 0 ? (
          grid(tasks)
        ) : (
          <p className="px-1 py-2 text-secondary text-muted">{t('noTasksToday')}</p>
        )}
      </Collapsible>

      {overdueCount > 0 && (
        <Collapsible
          as="h2"
          size="section"
          open={late.isOpen('all')}
          onToggle={() => late.toggle('all')}
          title={t('overdueTasks')}
          count={overdueCount}
        >
          {grid(overdue)}
          {overdueCount > overdue.length && (
            <p className="tnum mt-3 px-1 text-meta text-muted">
              {t('overdueOldestShown')} {overdue.length}
            </p>
          )}
        </Collapsible>
      )}
    </div>
  )
}

/**
 * "Building › Work item" — the project goes without saying on its own screen.
 * Each part isolated, since a Latin code beside an Arabic building name would
 * otherwise reorder.
 */
function Where({ task }) {
  const parts = [task.building, task.is_leaf ? task.item : null].filter(Boolean)
  if (parts.length === 0) return null
  return parts.map((part, i) => (
    <span key={i}>
      {/* An icon, not "›": the character is bidi-mirrored, and between two
          isolated runs it resolves differently from one gap to the next. */}
      {i > 0 && (
        <ChevronRight className="rtl-flip mx-0.5 inline h-3.5 w-3.5 align-[-0.125em]" aria-hidden />
      )}
      <Bidi>{part}</Bidi>
    </span>
  ))
}
