/**
 * The single door to the Odoo `field_portal` REST API.
 *
 * Responsibilities:
 *   - hold the Bearer API key and attach it to every request
 *   - normalise the API's `{"error": "<message>"}` shape into a thrown
 *     ApiError, so TanStack Query surfaces failures through `error` instead
 *     of every screen having to inspect response bodies
 *   - broadcast a 401 so the app can drop the bad key and re-prompt
 */

import { KEYS, readStored, writeStored } from './storage'

const RAW_BASE = import.meta.env.VITE_API_BASE ?? ''
export const API_BASE = RAW_BASE.replace(/\/+$/, '')
export const API_BASE_CONFIGURED = Boolean(API_BASE)

export const UNAUTHORIZED_EVENT = 'nfp:unauthorized'

/* -- key handling --------------------------------------------------------- */

let apiKey = readStored(KEYS.apiKey) || null

export const getApiKey = () => apiKey

export function setApiKey(key) {
  apiKey = key || null
  writeStored(KEYS.apiKey, apiKey)
}

/* -- errors --------------------------------------------------------------- */

export class ApiError extends Error {
  constructor(message, { status = 0, path = '', body = null, kind = 'http' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
    this.body = body
    this.kind = kind // 'http' | 'network' | 'config'
  }

  /** 401 — key missing/invalid. The engineer must re-enter it. */
  get isAuth() {
    return this.status === 401
  }

  /** 403 — authenticated, but this project isn't theirs. */
  get isForbidden() {
    return this.status === 403
  }

  /** Nothing reached the server: no signal, API down, or CORS refused us. */
  get isNetwork() {
    return this.kind === 'network'
  }

  /** Worth offering a retry button for. 400 usually isn't — fix the input. */
  get isRetryable() {
    return this.isNetwork || this.status === 0 || this.status >= 500 || this.status === 429
  }
}

/**
 * Pull the message out of whatever the server returned. The contract says
 * `{"error": "..."}`, but a proxy 502 or an Odoo traceback page is HTML, and
 * Odoo's own JSON-RPC layer sometimes wraps things in `{error:{message}}`.
 */
function extractMessage(body, status, statusText) {
  if (body && typeof body === 'object') {
    const e = body.error
    if (typeof e === 'string' && e.trim()) return e.trim()
    if (e && typeof e === 'object') {
      const nested = e.message || e.data?.message || e.data?.name
      if (typeof nested === 'string' && nested.trim()) return nested.trim()
    }
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim()
  }
  if (typeof body === 'string') {
    const text = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    // An HTML error page reduced to prose is noise; only use short plain text.
    if (text && text.length <= 200) return text
  }
  return statusText || `Request failed (${status})`
}

/* -- the request ---------------------------------------------------------- */

async function request(path, { method = 'GET', body, signal, timeoutMs = 30000 } = {}) {
  if (!API_BASE_CONFIGURED) {
    throw new ApiError(
      'VITE_API_BASE is not set. Copy .env.example to .env and set the API base URL, then restart the dev server.',
      { kind: 'config', path },
    )
  }

  const url = `${API_BASE}${path}`
  const headers = { Accept: 'application/json' }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // Uploads carry base64 photos and deserve a longer leash than a list read.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  const onAbort = () => controller.abort(signal?.reason)
  if (signal) {
    if (signal.aborted) onAbort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // Bearer auth only — never send Odoo session cookies cross-origin.
      credentials: 'omit',
      mode: 'cors',
    })
  } catch (err) {
    // A user-initiated cancel must propagate untouched or Query will retry it.
    if (signal?.aborted) throw err
    if (err?.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.', {
        kind: 'network',
        path,
      })
    }
    throw new ApiError(
      'Cannot reach the server. Check your internet connection and that the API is running.',
      { kind: 'network', path },
    )
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener?.('abort', onAbort)
  }

  const raw = await res.text()
  let parsed = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = raw
    }
  }

  if (!res.ok) {
    const error = new ApiError(extractMessage(parsed, res.status, res.statusText), {
      status: res.status,
      path,
      body: parsed,
    })
    if (error.isAuth) {
      // Drop the dead key immediately so nothing re-sends it, then let the
      // auth layer swap the UI back to the setup screen.
      setApiKey(null)
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { path } }))
    }
    throw error
  }

  // 200 with an `error` key: the API reports some soft failures this way.
  if (parsed && typeof parsed === 'object' && typeof parsed.error === 'string') {
    throw new ApiError(parsed.error, { status: res.status, path, body: parsed })
  }

  return parsed
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
}

/** Build `?a=1&b=2`, dropping empty values. */
export function qs(params) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}
