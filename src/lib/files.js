/**
 * Turning a camera capture into the API's attachment shape:
 *   { filename, data: "<base64, no data: prefix>", mimetype }
 *
 * A modern phone camera produces 4–12 MB JPEGs, and base64 inflates that by
 * a third. On site LTE that is a failed upload. So images are downscaled and
 * re-encoded before they ever become base64. Non-images (a PDF delivery note)
 * pass through untouched.
 */

const MAX_EDGE = 1600 // px on the long side — plenty for a site record photo
const JPEG_QUALITY = 0.82
const MAX_RAW_BYTES = 12 * 1024 * 1024 // reject absurd files before decoding

export const ACCEPTED_TYPES = 'image/*,application/pdf'

export class FileTooLargeError extends Error {}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read "${file.name}".`))
    reader.readAsDataURL(file)
  })
}

const stripPrefix = (dataUrl) => String(dataUrl).replace(/^data:[^;]*;base64,/, '')

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Not a readable image.'))
    img.src = dataUrl
  })
}

async function downscale(dataUrl) {
  const img = await loadImage(dataUrl)
  const { width, height } = img
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  if (scale === 1 && dataUrl.length < 1.6e6) return null // already small enough

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

/** Rough decoded size of a base64 payload, for the "x KB" hint in the UI. */
export function base64Bytes(b64) {
  if (!b64) return 0
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * @returns {Promise<{id,filename,data,mimetype,bytes,previewUrl}>}
 * `previewUrl` is a data: URL kept only for the thumbnail; it is stripped
 * before the object goes into a request payload (see toPayload).
 */
export async function fileToAttachment(file) {
  if (file.size > MAX_RAW_BYTES) {
    throw new FileTooLargeError(`"${file.name}" is larger than 12 MB.`)
  }

  const dataUrl = await readAsDataUrl(file)
  let finalUrl = dataUrl
  let mimetype = file.type || 'application/octet-stream'
  let filename = file.name || `upload-${Date.now()}`

  if (mimetype.startsWith('image/')) {
    try {
      const shrunk = await downscale(dataUrl)
      if (shrunk) {
        finalUrl = shrunk
        mimetype = 'image/jpeg'
        filename = filename.replace(/\.[^.]+$/, '') + '.jpg'
      }
    } catch {
      // HEIC and other formats the canvas can't decode: send the original.
    }
  }

  const data = stripPrefix(finalUrl)
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    filename,
    data,
    mimetype,
    bytes: base64Bytes(data),
    previewUrl: mimetype.startsWith('image/') ? finalUrl : null,
  }
}

/** Strip UI-only fields so only what the contract defines goes over the wire. */
export const toPayload = (attachments) =>
  (attachments || []).map(({ filename, data, mimetype }) => ({ filename, data, mimetype }))
