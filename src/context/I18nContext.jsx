import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { KEYS, readStored, writeStored } from '@/lib/storage'
import { LANGS, dictionaries } from '@/i18n/strings'

/**
 * UI language + document direction. Switching to Arabic flips `dir` on <html>,
 * and because the whole app is built on logical properties (ps-/pe-/ms-/me-,
 * start/end) rather than left/right, every screen mirrors without extra work.
 */

const I18nContext = createContext(null)

const initial = () => (readStored(KEYS.lang) === 'ar' ? 'ar' : 'en')

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initial)

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = LANGS[lang].dir
    writeStored(KEYS.lang, lang)
  }, [lang])

  const t = useCallback(
    (key, fallback) => dictionaries[lang][key] ?? dictionaries.en[key] ?? fallback ?? key,
    [lang],
  )

  const value = useMemo(
    () => ({
      lang,
      dir: LANGS[lang].dir,
      isRtl: LANGS[lang].dir === 'rtl',
      setLang,
      toggleLang: () => setLang((l) => (l === 'ar' ? 'en' : 'ar')),
      t,
    }),
    [lang, t],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
