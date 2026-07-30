import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'

/**
 * This portal is online-only by design — there is no queue and no service
 * worker. So the honest thing to do when the signal drops in a basement is
 * say so immediately, rather than letting the engineer fill in a form that
 * cannot be saved.
 */
export default function OfflineBanner() {
  const { t } = useI18n()
  const [online, setOnline] = useState(() => navigator.onLine !== false)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return (
    <AnimatePresence>
      {!online && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="sticky top-14 z-30 overflow-hidden bg-warning text-center"
          role="status"
        >
          <p className="flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-semibold text-black">
            <WifiOff className="h-4 w-4" aria-hidden />
            {t('offlineTitle')} — {t('offlineBody')}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
