import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ThemeProvider } from '@/context/ThemeContext'
import { I18nProvider } from '@/context/I18nContext'
import { AuthProvider } from '@/context/AuthContext'
import { TrailProvider } from '@/context/TrailContext'
import { ToastProvider } from '@/components/Toast'
import { installArabicFont } from '@/lib/fonts'
import './index.css'

installArabicFont()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Site wifi is flaky; two extra attempts is worth it. But never retry
      // an auth or permission failure — the answer will not change.
      retry: (failureCount, error) => {
        if (error?.isAuth || error?.isForbidden || error?.status === 400) return false
        return failureCount < 2
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
      // A phone that has been in a pocket comes back with a stale list; this
      // is the one refetch worth paying for.
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false, // writes are never auto-retried — see api/queries.js
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>
                <TrailProvider>
                  <Routes>
                    <Route path="/" element={<Navigate to="/projects" replace />} />
                    <Route path="*" element={<App />} />
                  </Routes>
                </TrailProvider>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
