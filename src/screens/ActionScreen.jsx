import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, ChevronRight } from 'lucide-react'
import Screen from '@/components/Screen'
import { ENTRY_ORDER, ENTRY_TYPES } from '@/api/entryTypes'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import { bidi } from '@/lib/text'

/**
 * The hub an engineer returns to after every save.
 *
 * Standing at one spot they will log material, then plant hours, then a
 * photo — so this screen, not the project list, is the centre of gravity of
 * the whole app. Four big tiles, one tap each.
 */

const container = { animate: { transition: { staggerChildren: 0.05 } } }
const tile = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 30 } },
}

export default function ActionScreen() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { trail } = useTrail()

  const subtaskName = trail.subtask?.taskId === taskId ? trail.subtask.name : null

  return (
    <Screen title={t('logWork')}>
      {subtaskName && (
        <div className="mb-4 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            {t('subtasks')}
          </p>
          <p className="mt-0.5 font-semibold leading-snug" {...bidi(subtaskName)}>
            {subtaskName}
          </p>
        </div>
      )}

      <motion.div
        variants={container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3"
      >
        {ENTRY_ORDER.map((key) => {
          const { icon: Icon, tone } = ENTRY_TYPES[key]
          const accent = tone === 'accent'
          return (
            <motion.button
              key={key}
              variants={tile}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(`/subtasks/${taskId}/${key}`)}
              className={`card flex min-h-[9.5rem] flex-col items-start justify-between p-4 text-start transition-colors
                          active:bg-surface-2 sm:hover:border-border-strong`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  accent ? 'bg-accent-soft text-accent' : 'bg-primary-soft text-primary'
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-3">
                <span className="block text-[15px] font-bold leading-tight">{t(key)}</span>
                <span className="mt-1 block text-[12px] leading-snug text-muted">
                  {t(`${key}Hint`)}
                </span>
              </span>
            </motion.button>
          )
        })}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/subtasks/${taskId}/photo`)}
        className="card mt-3 flex w-full items-center gap-3 p-4 text-start active:bg-surface-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Camera className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight">{t('photo')}</span>
          <span className="mt-0.5 block text-[12px] text-muted">{t('photoHint')}</span>
        </span>
        <ChevronRight className="rtl-flip h-5 w-5 shrink-0 text-subtle" aria-hidden />
      </motion.button>
    </Screen>
  )
}
