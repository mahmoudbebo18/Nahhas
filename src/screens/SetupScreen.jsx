import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, ChevronDown, Eye, EyeOff, HelpCircle, KeyRound, LogIn } from 'lucide-react'
import Screen from '@/components/Screen'
import { Spinner } from '@/components/states'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { verifyKey } from '@/api/queries'
import { API_BASE, API_BASE_CONFIGURED } from '@/lib/apiClient'

/**
 * The one-time sign-in.
 *
 * The key is validated against /auth/whoami *before* it is stored, so a typo
 * or a stale key never displaces a working one. On success the whoami payload
 * is cached as the engineer's identity for the rest of the session.
 */
export default function SetupScreen() {
  const { t } = useI18n()
  const { signIn, expired } = useAuth()
  const [key, setKey] = useState('')
  const [reveal, setReveal] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const login = useMutation({
    mutationFn: (candidate) => verifyKey(candidate),
    onSuccess: (who, candidate) => signIn(candidate, who),
  })

  const trimmed = key.trim()

  function submit(e) {
    e.preventDefault()
    if (!trimmed || login.isPending) return
    login.mutate(trimmed)
  }

  return (
    <Screen className="max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="mt-6"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-raised">
            <KeyRound className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold">{t('setupTitle')}</h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t('setupLead')}</p>
        </div>

        {expired && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-[13px] font-medium leading-relaxed text-warning"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {t('sessionExpired')}
          </motion.p>
        )}

        {!API_BASE_CONFIGURED && (
          <p
            className="mb-4 rounded-xl border border-danger/30 bg-danger/10 p-3 text-[13px] leading-relaxed text-danger"
            role="alert"
          >
            <strong className="block">{t('configMissing')}</strong>
            <code className="mt-1 block break-all">VITE_API_BASE</code> is empty. Copy{' '}
            <code>.env.example</code> to <code>.env</code>, set it, and restart the dev server.
          </p>
        )}

        <form onSubmit={submit} className="card p-5">
          <label className="field-label" htmlFor="api-key">
            {t('apiKeyLabel')}
          </label>
          <div className="relative">
            <input
              id="api-key"
              type={reveal ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                login.reset()
              }}
              placeholder={t('apiKeyPlaceholder')}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              dir="ltr"
              className="input pe-12 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-subtle hover:text-text"
              aria-label={reveal ? 'Hide key' : 'Show key'}
            >
              {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {login.isError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 text-[13px] font-medium text-danger"
              role="alert"
            >
              {login.error.message}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileTap={trimmed && !login.isPending ? { scale: 0.98 } : undefined}
            disabled={!trimmed || login.isPending || !API_BASE_CONFIGURED}
            className="btn-primary mt-4 w-full"
          >
            {login.isPending ? (
              <>
                <Spinner className="h-5 w-5" />
                {t('checking')}
              </>
            ) : (
              <>
                <LogIn className="rtl-flip h-5 w-5" aria-hidden />
                {t('signIn')}
              </>
            )}
          </motion.button>

          <p className="mt-3 text-center text-[12px] leading-relaxed text-subtle">
            {t('keyStoredNote')}
          </p>
        </form>

        <div className="card mt-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            className="flex min-h-tap w-full items-center gap-2 px-4 text-start text-sm font-semibold"
            aria-expanded={helpOpen}
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-accent" aria-hidden />
            <span className="flex-1">{t('keyHelpTitle')}</span>
            <motion.span animate={{ rotate: helpOpen ? 180 : 0 }}>
              <ChevronDown className="h-4 w-4 text-subtle" aria-hidden />
            </motion.span>
          </button>

          <motion.div
            initial={false}
            animate={{ height: helpOpen ? 'auto' : 0, opacity: helpOpen ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-4 text-[13px] leading-relaxed text-muted">{t('keyHelp')}</p>
          </motion.div>
        </div>

        {API_BASE_CONFIGURED && (
          <p className="mt-4 text-center text-[11px] text-subtle" dir="ltr">
            {API_BASE}
          </p>
        )}
      </motion.div>
    </Screen>
  )
}
