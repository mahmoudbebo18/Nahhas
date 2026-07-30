import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera } from 'lucide-react'
import Screen from '@/components/Screen'
import Field from '@/components/form/Field'
import AttachmentPicker from '@/components/form/AttachmentPicker'
import SubmitBar from '@/components/form/SubmitBar'
import { ErrorState } from '@/components/states'
import { useUploadPhoto } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useTrail } from '@/context/TrailContext'
import { useToast } from '@/components/Toast'
import { bidi } from '@/lib/text'

/**
 * Standalone photo upload — POST /subtasks/<task_id>/photo with no `line_id`,
 * so the photo attaches to the sub-task rather than to a specific entry.
 * (Attaching to an entry happens from the success sheet right after a write.)
 *
 * The endpoint takes one photo per call, so a multi-photo pick is sent as a
 * sequence and partial success is reported honestly rather than rolled back.
 */
export default function PhotoScreen() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()
  const { trail } = useTrail()
  const toast = useToast()
  const upload = useUploadPhoto(taskId)

  const [photos, setPhotos] = useState([])
  const [failed, setFailed] = useState(null)

  const subtaskName = trail.subtask?.taskId === taskId ? trail.subtask.name : null

  async function submit(e) {
    e?.preventDefault()
    if (photos.length === 0) return
    setFailed(null)

    const remaining = []
    let uploaded = 0
    let lastError = null

    for (const attachment of photos) {
      try {
        await upload.mutateAsync({ attachment })
        uploaded += 1
      } catch (err) {
        lastError = err
        remaining.push(attachment) // keep it so "retry" only resends failures
      }
    }

    setPhotos(remaining)

    if (uploaded) toast.success(`${uploaded} × ${t('savedPhoto')}`)
    if (lastError) setFailed(lastError)
    else navigate(`/subtasks/${taskId}`)
  }

  return (
    <Screen>
      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted">
          <Camera className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold leading-tight">{t('photo')}</h1>
          {subtaskName && (
            <p className="mt-0.5 truncate text-sm text-muted" {...bidi(subtaskName)}>
              {subtaskName}
            </p>
          )}
        </div>
      </header>

      <form onSubmit={submit}>
        <Field label={t('attachments')} error={photos.length === 0 && failed ? t('errNoAttachment') : undefined}>
          <AttachmentPicker attachments={photos} onChange={setPhotos} max={8} />
        </Field>

        {failed && <ErrorState error={failed} onRetry={submit} compact />}

        <SubmitBar
          onSubmit={submit}
          pending={upload.isPending}
          disabled={photos.length === 0}
          label={photos.length > 1 ? `${t('submit')} (${photos.length})` : t('submit')}
        />
      </form>
    </Screen>
  )
}
