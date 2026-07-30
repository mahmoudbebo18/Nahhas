import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, FileText, ImagePlus, Loader2, X } from 'lucide-react'
import { useI18n } from '@/context/I18nContext'
import { ACCEPTED_TYPES, fileToAttachment, formatBytes } from '@/lib/files'
import { useToast } from '../Toast'

/**
 * Photo / document attachments, encoded to base64 for the write payload.
 *
 * Two entry points on purpose: `capture="environment"` opens the rear camera
 * straight away (what an engineer standing at the wall wants), while the
 * second button is the normal file picker for a receipt already in the gallery.
 * Images are downscaled in lib/files before encoding — see the note there.
 */
export default function AttachmentPicker({ attachments, onChange, max = 6 }) {
  const { t } = useI18n()
  const toast = useToast()
  const cameraRef = useRef(null)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const atLimit = attachments.length >= max

  async function ingest(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = '' // let the same file be re-picked after a removal
    if (files.length === 0) return

    setBusy(true)
    const accepted = []
    for (const file of files.slice(0, max - attachments.length)) {
      try {
        accepted.push(await fileToAttachment(file))
      } catch (err) {
        toast.error(err.message)
      }
    }
    setBusy(false)
    if (accepted.length) onChange([...attachments, ...accepted])
  }

  return (
    <div>
      <div className="flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => cameraRef.current?.click()}
          disabled={atLimit || busy}
          className="btn-outline flex-1 gap-2"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-4 w-4" aria-hidden />
          )}
          {t('addPhoto')}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => fileRef.current?.click()}
          disabled={atLimit || busy}
          className="btn-outline shrink-0 px-4"
          aria-label={t('chooseFile')}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
        </motion.button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={ingest}
      />
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        className="hidden"
        onChange={ingest}
      />

      <AnimatePresence initial={false}>
        {attachments.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 grid grid-cols-3 gap-2 xs:grid-cols-4"
          >
            <AnimatePresence initial={false}>
              {attachments.map((a) => (
                <motion.li
                  key={a.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2"
                >
                  {a.previewUrl ? (
                    <img
                      src={a.previewUrl}
                      alt={a.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-subtle">
                      <FileText className="h-6 w-6" aria-hidden />
                      <span className="line-clamp-2 text-[10px] leading-tight">{a.filename}</span>
                    </div>
                  )}

                  <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-center text-[10px] font-medium text-white">
                    {formatBytes(a.bytes)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                    className="absolute end-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur active:bg-black/80"
                    aria-label={`${t('removeAttachment')} ${a.filename}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
