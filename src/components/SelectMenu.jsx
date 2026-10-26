import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import Sheet from './Sheet'
import { useIsWide } from '@/hooks/useIsWide'

/**
 * A choice from a short list, in place of a native <select> — whose popup
 * the browser draws in its own font, ignores the theme in, and on desktop
 * can't show a count or a group heading.
 *
 * Same split as the date picker: a popover anchored under the button on
 * anything wide, a bottom sheet on a phone, where the thumb already is. Both
 * render one listbox.
 *
 * `options`: `{ value, label, count?, group? }`. Consecutive options sharing
 * a `group` sit under that heading. `display` is what the button shows for
 * the current value (defaults to its label). `align` is the popover's edge.
 *
 * Keyboard: the list takes focus on open, arrows move, Home/End jump, Enter
 * or Space picks, Escape closes and hands focus back to the button.
 */
export default function SelectMenu({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  display,
  align = 'end',
  className = '',
}) {
  const wide = useIsWide()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const selected = options[selectedIndex]

  function openMenu() {
    setActive(selectedIndex)
    setOpen(true)
  }

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function pick(option) {
    onChange(option.value)
    close()
  }

  // The list takes focus once it is on screen, so the arrows work at once.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
  }, [open])

  // Keep the active option in view as the arrows move through a long list.
  useEffect(() => {
    if (!open) return
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  // Desktop only — the sheet closes itself on Escape and on its backdrop.
  useEffect(() => {
    if (!open || !wide) return
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, wide])

  function onListKey(e) {
    const last = options.length - 1
    const moves = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(options[active]),
      ' ': () => pick(options[active]),
      Escape: () => close(),
      Tab: () => close(false),
    }
    const move = moves[e.key]
    if (!move) return
    if (e.key !== 'Tab') e.preventDefault()
    move()
  }

  const list = (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      tabIndex={-1}
      aria-label={label}
      aria-activedescendant={`${listId}-${active}`}
      onKeyDown={onListKey}
      className={`focus-visible:ring-0 focus-visible:ring-offset-0 ${wide ? 'max-h-80 overflow-y-auto p-1.5' : 'p-3'}`}
    >
      {options.map((option, i) => {
        const isSelected = i === selectedIndex
        const heading = option.group && option.group !== options[i - 1]?.group ? option.group : null
        return (
          <Fragment key={option.value}>
            {heading && (
              <li
                role="presentation"
                className={`px-3 pb-1 text-meta font-semibold text-muted ${i > 0 ? 'mt-2 border-t border-border pt-3' : 'pt-1'}`}
              >
                {heading}
              </li>
            )}
            <li
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={isSelected}
              onClick={() => pick(option)}
              onPointerMove={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-control px-3 text-start transition-colors ${
                wide ? 'min-h-touch text-secondary' : 'min-h-tap'
              } ${i === active ? 'bg-surface-2' : ''} ${
                isSelected ? 'font-semibold text-primary' : 'text-text'
              } ${option.group ? 'ps-5' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.count != null && (
                <span className="tnum shrink-0 text-meta font-medium text-muted">{option.count}</span>
              )}
              <Check
                className={`h-4 w-4 shrink-0 text-primary ${isSelected ? '' : 'invisible'}`}
                aria-hidden
              />
            </li>
          </Fragment>
        )
      })}
    </ul>
  )

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault()
            openMenu()
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}: ${selected?.text ?? ''}`}
        className={`btn-outline min-h-touch w-full justify-start gap-2 px-3 text-secondary ${
          open ? 'border-primary ring-2 ring-primary/25' : ''
        }`}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden />}
        <span className="min-w-0 flex-1 truncate text-start">{display ?? selected?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {wide ? (
        <AnimatePresence>
          {open && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: 'spring', stiffness: 500, damping: 34, mass: 0.7 },
              }}
              exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.13, ease: 'easeIn' } }}
              className={`absolute top-full z-40 mt-2 w-max min-w-full max-w-[22rem] rounded-card border
                          border-border bg-surface shadow-overlay ${align === 'end' ? 'end-0' : 'start-0'}`}
            >
              {list}
            </motion.div>
          )}
        </AnimatePresence>
      ) : (
        <Sheet open={open} onClose={() => close()} title={label}>
          {list}
        </Sheet>
      )}
    </div>
  )
}
