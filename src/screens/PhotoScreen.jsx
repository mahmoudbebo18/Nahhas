import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Screen from '@/components/Screen'
import Field from '@/components/form/Field'
import AttachmentPicker from '@/components/form/AttachmentPicker'
import SubmitBar from '@/components/form/SubmitBar'
import { ErrorState } from '@/components/states'
import { useUploadPhoto } from '@/api/queries'
import { useI18n } from '@/context/I18nContext'
import { useTrail } from '@/context/TrailContext'
import { useToast } from '@/components/Toast'
import Bidi from '@/components/Bidi'

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

  // String-compared: the route param is a string, the trail holds a number.
  const subtaskName =
    String(trail.subtask?.taskId ?? '') === String(taskId) ? trail.subtask.name : null

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
    <Screen
      width="narrow"
      title={t('photo')}
      meta={subtaskName ? <Bidi>{subtaskName}</Bidi> : undefined}
    >

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
