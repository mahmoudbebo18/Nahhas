import { useState } from 'react'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, Eye, EyeOff, KeyRound, LogIn } from 'lucide-react'
import Screen from '@/components/Screen'
import { Spinner } from '@/components/states'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { requestToken } from '@/api/queries'
import { API_BASE, API_BASE_CONFIGURED } from '@/lib/apiClient'

/**
 * The one-time sign-in.
 *
 * Credentials are exchanged for a bearer token at POST /auth/token, and only
 * a successful exchange stores anything — so a wrong password never displaces
 * a working session. The token is kept under the same storage key the API
 * client already reads, which is why nothing else in the app changes.
 */
export default function SetupScreen() {
  const { t } = useI18n()
  const { signIn, expired } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const auth = useMutation({
    mutationFn: (credentials) => requestToken(credentials),
    // The response doubles as the identity payload (name, login,
    // employee_id, allowed_project_ids); whoami refreshes it on load.
    onSuccess: (data) => signIn(data.token, data),
  })

  const trimmedLogin = login.trim()
  const canSubmit = Boolean(trimmedLogin && password) && !auth.isPending

  function submit(e) {
    e.preventDefault()

    const next = {}
    if (!trimmedLogin) next.login = t('errLoginRequired')
    if (!password) next.password = t('errPasswordRequired')
    setFieldErrors(next)
    if (Object.keys(next).length > 0 || auth.isPending) return

    auth.mutate({ login: trimmedLogin, password })
  }

  // 401 must never reveal which of the two fields was wrong.
  const authMessage =
    auth.error && (auth.error.code === 'invalid_credentials'
      ? t('errInvalidCredentials')
      : auth.error.message)

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
          <label className="field-label" htmlFor="login">
            {t('loginLabel')}
          </label>
          <input
            id="login"
            type="text"
            inputMode="email"
            value={login}
            onChange={(e) => {
              setLogin(e.target.value)
              setFieldErrors((f) => ({ ...f, login: undefined }))
              auth.reset()
            }}
            placeholder={t('loginPlaceholder')}
            autoComplete="username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            dir="ltr"
            className="input"
          />
          {fieldErrors.login && (
            <p className="mt-1.5 text-[13px] font-medium text-danger" role="alert">
              {fieldErrors.login}
            </p>
          )}

          <label className="field-label mt-4" htmlFor="password">
            {t('passwordLabel')}
          </label>
          <div className="relative">
            <input
              id="password"
              type={reveal ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setFieldErrors((f) => ({ ...f, password: undefined }))
                auth.reset()
              }}
              placeholder={t('passwordPlaceholder')}
              autoComplete="current-password"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              dir="ltr"
              className="input pe-12"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-subtle hover:text-text"
              aria-label={reveal ? t('hidePassword') : t('showPassword')}
            >
              {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1.5 text-[13px] font-medium text-danger" role="alert">
              {fieldErrors.password}
            </p>
          )}

          {auth.isError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 text-[13px] font-medium text-danger"
              role="alert"
            >
              {authMessage}
            </motion.p>
          )}

          <motion.button
            type="submit"
            whileTap={canSubmit ? { scale: 0.98 } : undefined}
            disabled={!canSubmit || !API_BASE_CONFIGURED}
            className="btn-primary mt-4 w-full"
          >
            {auth.isPending ? (
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

        <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">
          {t('forgotPassword')}
        </p>

        {API_BASE_CONFIGURED && (
          <p className="mt-4 text-center text-[11px] text-subtle" dir="ltr">
            {API_BASE}
          </p>
        )}
      </motion.div>
    </Screen>
  )
}
