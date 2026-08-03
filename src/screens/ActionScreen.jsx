import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, ChevronRight, PackageX } from 'lucide-react'
import Screen from '@/components/Screen'
import {
  ENTRY_ORDER,
  ENTRY_TYPES,
  hasNothingToEnter,
  isTypeEmpty,
} from '@/api/entryTypes'
import { useSubtaskAvailability } from '@/api/queries'
import { useTrail } from '@/context/TrailContext'
import { useI18n } from '@/context/I18nContext'
import Bidi from '@/components/Bidi'

/**
 * The hub an engineer returns to after every save.
 *
 * Standing at one spot they will log material, then plant hours, then a
 * photo — so this screen, not the project list, is the centre of gravity of
 * the whole app. Four big tiles, one tap each.
 *
 * A tile whose type has no products set up on this sub-task is disabled here
 * rather than opening on an empty state. Most level-aware sub-tasks are costed
 * for labour alone, which the portal does not write, so without this the walk
 * ends in a dead end that looks like a fault in the app.
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

  // Route params are strings, the trail records the numeric id it got from
  // JSON — compare as strings or the name never shows.
  const subtaskName =
    String(trail.subtask?.taskId ?? '') === String(taskId) ? trail.subtask.name : null
  const available = useSubtaskAvailability(taskId).data

  return (
    <Screen title={t('logWork')}>
      {subtaskName && (
        <div className="mb-4 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-subtle">
            {t('subtasks')}
          </p>
          <p className="mt-0.5 font-semibold leading-snug">
            <Bidi>{subtaskName}</Bidi>
          </p>
        </div>
      )}

      {/* Photos need no products, so this says "nothing to log", not
          "nothing to do" — the camera below stays live either way. */}
      {hasNothingToEnter(available) && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
          <PackageX className="mt-0.5 h-5 w-5 shrink-0 text-subtle" aria-hidden />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-snug">{t('nothingToEnterTitle')}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted">{t('nothingToEnterBody')}</p>
          </div>
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
          const empty = isTypeEmpty(available, key)
          return (
            <motion.button
              key={key}
              variants={tile}
              whileTap={empty ? undefined : { scale: 0.96 }}
              disabled={empty}
              onClick={() => navigate(`/subtasks/${taskId}/${key}`)}
              className={`card flex min-h-[9.5rem] flex-col items-start justify-between p-4 text-start transition-colors
                          ${
                            empty
                              ? 'opacity-55'
                              : 'active:bg-surface-2 sm:hover:border-border-strong'
                          }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  empty
                    ? 'bg-surface-2 text-subtle'
                    : accent
                      ? 'bg-accent-soft text-accent'
                      : 'bg-primary-soft text-primary'
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-3">
                <span className="block text-[15px] font-bold leading-tight">{t(key)}</span>
                <span className="mt-1 block text-[12px] leading-snug text-muted">
                  {empty ? t('typeNotSetUp') : t(`${key}Hint`)}
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
