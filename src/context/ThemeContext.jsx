import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { KEYS, readStored, writeStored } from '@/lib/storage'

/**
 * Light is the default. We only ever go dark on an explicit, persisted choice
 * — the OS preference is deliberately NOT followed, because a site phone left
 *  on auto-dark in bright sun is harder to read than the light theme.
 *
 * The very first paint is handled by the inline script in index.html; this
 * context takes over from there and keeps the class in sync.
 */

const ThemeContext = createContext(null)

const initial = () => (readStored(KEYS.theme) === 'dark' ? 'dark' : 'light')

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme !== 'dark')
    writeStored(KEYS.theme, theme)

    // Keep the browser chrome (iOS status bar, Android nav bar) in step.
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
    if (meta) meta.content = theme === 'dark' ? '#0A0A0A' : '#06412a'
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggle, setTheme }),
    [theme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
