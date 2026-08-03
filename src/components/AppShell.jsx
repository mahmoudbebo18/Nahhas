import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ClipboardList, Languages } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import Breadcrumb from './Breadcrumb'
import AccountSheet from './AccountSheet'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { useDraftCount } from '@/api/queries'

/**
 * Persistent chrome: brand bar, back, language, theme, account — plus the
 * breadcrumb. It stays mounted across route changes so the header never
 * re-animates while the screen beneath it slides.
 */
export default function AppShell({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { identity, isAuthed } = useAuth()
  const { t, lang, toggleLang } = useI18n()
  const [accountOpen, setAccountOpen] = useState(false)

  // Nothing to go back to from the project list — it is the root of the walk.
  const canGoBack = isAuthed && location.pathname !== '/projects'
  const initial = String(identity?.name ?? '?').trim().charAt(0).toUpperCase()

  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <header className="theme-tint sticky top-0 z-30 bg-header text-header-fg shadow-sm pt-safe">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2">
          {canGoBack ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
              aria-label={t('back')}
            >
              <ChevronLeft className="rtl-flip h-6 w-6" aria-hidden />
            </motion.button>
          ) : (
            <div className="w-2" />
          )}

          <button
            type="button"
            onClick={() => isAuthed && navigate('/projects')}
            className="flex min-w-0 flex-1 flex-col items-start rounded-lg px-2 py-1 text-start"
          >
            <span className="truncate text-[15px] font-bold leading-tight">{t('appName')}</span>
            <span className="truncate text-[11px] font-medium leading-tight opacity-70">
              {t('brand')}
            </span>
          </button>

          {isAuthed && <DraftsButton />}

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={toggleLang}
            className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl px-2 hover:bg-white/10"
            aria-label={t('language')}
            title={t('language')}
          >
            <Languages className="h-[18px] w-[18px]" aria-hidden />
            <span className="text-xs font-bold">{lang === 'ar' ? 'EN' : 'ع'}</span>
          </motion.button>

          <ThemeToggle />

          {isAuthed && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setAccountOpen(true)}
              className="ms-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold hover:bg-white/25"
              aria-label={t('signedInAs')}
            >
              {initial}
            </motion.button>
          )}
        </div>
      </header>

      {isAuthed && <Breadcrumb />}

      <div className="flex-1">{children}</div>

      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  )
}

/**
 * Way into the review basket, with the count of entries not yet sent.
 *
 * It sits in the persistent chrome rather than on one screen because the
 * engineer accumulates drafts from five levels down and has to be able to get
 * back to them without walking out of the flow first.
 */
function DraftsButton() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const count = useDraftCount()

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={() => navigate('/entries')}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl hover:bg-white/10"
      aria-label={count > 0 ? `${t('myEntries')} — ${count} ${t('waitingSuffix')}` : t('myEntries')}
      title={t('myEntries')}
    >
      <ClipboardList className="h-[20px] w-[20px]" aria-hidden />
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className="tnum absolute end-1 top-1 min-w-[18px] rounded-full bg-accent px-1
                     text-[11px] font-bold leading-[18px] text-accent-fg"
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </motion.button>
  )
}
