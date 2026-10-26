import { useRef, useState } from 'react'
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
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={atLimit || busy}
          className="btn-outline flex-1"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          ) : (
            <Camera className="h-5 w-5" aria-hidden />
          )}
          {t('addPhoto')}
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={atLimit || busy}
          className="btn-outline w-tap shrink-0 px-0"
          aria-label={t('chooseFile')}
          title={t('chooseFile')}
        >
          <ImagePlus className="h-5 w-5" aria-hidden />
        </button>
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

      {attachments.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 xs:grid-cols-4">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="relative aspect-square overflow-hidden rounded-control border border-border bg-surface-2"
            >
              {a.previewUrl ? (
                <img src={a.previewUrl} alt={a.filename} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-muted">
                  <FileText className="h-6 w-6" aria-hidden />
                  <span className="line-clamp-2 text-meta">{a.filename}</span>
                </div>
              )}

              <span className="tnum absolute inset-x-0 bottom-0 bg-black/65 px-1 py-0.5 text-center text-meta font-medium text-white">
                {formatBytes(a.bytes)}
              </span>

              {/* 44px to press, drawn as a 28px chip so it doesn't cover the photo. */}
              <button
                type="button"
                onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
                className="absolute end-0 top-0 flex h-touch w-touch items-center justify-center"
                aria-label={`${t('removeAttachment')} ${a.filename}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white">
                  <X className="h-4 w-4" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
