import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, ClipboardList, Languages } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import Breadcrumb from './Breadcrumb'
import AccountSheet from './AccountSheet'
import { SCREEN_WIDTH } from './Screen'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { useDraftCount } from '@/api/queries'

/**
 * Persistent chrome: brand bar, back, language, theme, account — plus the
 * breadcrumb. It stays mounted across route changes so the header never
 * re-animates while the screen beneath it changes.
 */

// Header controls sit on the brand green, so they get a white wash for hover
// and press instead of the surface colours the page uses.
const headerBtn =
  'flex h-touch min-w-touch shrink-0 items-center justify-center rounded-control transition-colors hover:bg-white/10 active:bg-white/15'

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
      <header className="theme-tint sticky top-0 z-30 bg-header text-header-fg pt-safe">
        <div className={`mx-auto flex h-14 ${SCREEN_WIDTH} items-center gap-1 px-2`}>
          {canGoBack ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={headerBtn}
              aria-label={t('back')}
            >
              <ChevronLeft className="rtl-flip h-6 w-6" aria-hidden />
            </button>
          ) : (
            <div className="w-2" />
          )}

          <button
            type="button"
            onClick={() => isAuthed && navigate('/projects')}
            className="flex min-h-touch min-w-0 flex-1 flex-col items-start justify-center rounded-control px-2 text-start"
          >
            <span className="truncate text-body font-bold">{t('appName')}</span>
            <span className="truncate text-meta opacity-80">{t('brand')}</span>
          </button>

          {isAuthed && <DraftsButton />}

          <button
            type="button"
            onClick={toggleLang}
            className={`${headerBtn} gap-1 px-2`}
            aria-label={t('language')}
            title={t('language')}
          >
            <Languages className="h-5 w-5" aria-hidden />
            <span className="text-meta font-bold">{lang === 'ar' ? 'EN' : 'ع'}</span>
          </button>

          <ThemeToggle />

          {isAuthed && (
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className={headerBtn}
              aria-label={t('signedInAs')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-secondary font-bold">
                {initial}
              </span>
            </button>
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
 * back to them without walking out of the flow first. The counter is the
 * header's one orange thing: it is the alert that work is still on the phone.
 */
function DraftsButton() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const count = useDraftCount()

  return (
    <button
      type="button"
      onClick={() => navigate('/entries')}
      className={`${headerBtn} relative`}
      aria-label={count > 0 ? `${t('myEntries')} — ${count} ${t('waitingSuffix')}` : t('myEntries')}
      title={t('myEntries')}
    >
      <ClipboardList className="h-5 w-5" aria-hidden />
      {count > 0 && (
        <span
          className="tnum absolute end-1 top-1 min-w-5 rounded-full bg-accent px-1 text-center
                     text-meta font-bold leading-5 text-accent-fg"
          aria-hidden
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
