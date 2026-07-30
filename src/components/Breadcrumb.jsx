import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { bidi } from '@/lib/text'

/**
 * "Home › Tower B › Floor 03 › بند عمل 1 › Blockwork"
 *
 * Every crumb is a tap target back to that step, which is what stops an
 * engineer four levels deep from having to back out one screen at a time to
 * switch buildings. On a phone the trail overflows, so it scrolls horizontally
 * and auto-pins to the deepest crumb.
 */
export default function Breadcrumb() {
  const { trail } = useTrail()
  const { t } = useI18n()
  const navigate = useNavigate()
  const scroller = useRef(null)

  const crumbs = []
  if (trail.project) {
    const p = trail.project
    crumbs.push({
      key: 'project',
      label: p.name,
      to: p.levelAware === false ? `/projects/${p.id}/tasks` : `/projects/${p.id}/levels`,
    })
  }
  if (trail.level && trail.project) {
    crumbs.push({
      key: 'level',
      label: trail.level.label,
      to: `/projects/${trail.project.id}/levels/${trail.level.level}/items`,
    })
  }
  if (trail.item) {
    crumbs.push({
      key: 'item',
      label: trail.item.name,
      to: `/items/${trail.item.taskId}/subtasks`,
    })
  }
  if (trail.subtask) {
    crumbs.push({
      key: 'subtask',
      label: trail.subtask.name,
      to: `/subtasks/${trail.subtask.taskId}`,
    })
  }

  // Keep the deepest crumb visible as the engineer drills in. Under dir="rtl"
  // the scroll axis is inverted (scrollLeft runs negative), and the direction
  // is inherited from <html> — so it has to be read off the computed style,
  // not the element's own `dir` attribute, which is empty here.
  const deepest = crumbs.map((c) => c.label).join('›')
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    el.scrollTo({ left: rtl ? -el.scrollWidth : el.scrollWidth, behavior: 'smooth' })
  }, [deepest])

  if (crumbs.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="theme-tint sticky top-[3.5rem] z-20 border-b border-border bg-bg/85 backdrop-blur"
    >
      <ol
        ref={scroller}
        className="no-scrollbar mx-auto flex max-w-2xl items-center gap-1 overflow-x-auto px-3 py-2"
      >
        <li className="shrink-0">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-text"
            aria-label={t('home')}
          >
            <Home className="h-4 w-4" aria-hidden />
          </button>
        </li>

        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.key} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="rtl-flip h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden />
              <button
                type="button"
                onClick={() => !isLast && navigate(crumb.to)}
                disabled={isLast}
                aria-current={isLast ? 'page' : undefined}
                className={`h-8 max-w-[10rem] truncate rounded-lg px-2 text-[13px] font-medium ${
                  isLast
                    ? 'cursor-default text-text'
                    : 'text-muted hover:bg-surface-2 hover:text-text'
                }`}
                {...bidi(crumb.label)}
              >
                {crumb.label}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
