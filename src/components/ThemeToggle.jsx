import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useI18n } from '@/context/I18nContext'

/**
 * Sun ⇄ moon toggle.
 *
 * Drawn as one SVG rather than two swapped icons so the shape can genuinely
 * morph: the disc slides and a shadow circle moves in to bite a crescent out
 * of it, while the eight rays retract into the centre. Everything is a spring
 * on transform/opacity, so it stays smooth on a mid-range phone.
 */

const RAYS = Array.from({ length: 8 }, (_, i) => i * 45)

const spring = { type: 'spring', stiffness: 320, damping: 26, mass: 0.7 }

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()
  const { t } = useI18n()
  const label = isDark ? t('lightMode') : t('darkMode')

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl
                 text-header-fg/90 transition-colors hover:bg-white/10"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[22px] w-[22px] overflow-visible"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          {/* The mask is what turns the sun's disc into a crescent. */}
          <mask id="theme-toggle-mask">
            <rect width="24" height="24" fill="white" />
            <motion.circle
              cx="12"
              cy="12"
              r="9"
              fill="black"
              initial={false}
              animate={isDark ? { cx: 17, cy: 7 } : { cx: 30, cy: -6 }}
              transition={spring}
            />
          </mask>
        </defs>

        <motion.circle
          cx="12"
          cy="12"
          fill="currentColor"
          mask="url(#theme-toggle-mask)"
          initial={false}
          animate={{ r: isDark ? 9 : 5 }}
          transition={spring}
        />

        <motion.g
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={isDark ? { opacity: 0, scale: 0.4, rotate: -60 } : { opacity: 1, scale: 1, rotate: 0 }}
          transition={spring}
          style={{ originX: '12px', originY: '12px' }}
        >
          {RAYS.map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="1.6"
              x2="12"
              y2="3.6"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </motion.g>
      </svg>
    </motion.button>
  )
}
