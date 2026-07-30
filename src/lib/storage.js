/**
 * localStorage with a namespace and a hard guarantee that it never throws.
 * Site phones get used in private windows and with storage quota exhausted;
 * a crash on read would lock an engineer out of the app entirely.
 */

const NS = 'nfp.'

export const KEYS = {
  apiKey: 'apiKey',
  identity: 'identity', // cached /auth/whoami payload, for instant boot
  theme: 'theme',
  lang: 'lang',
}

export function readStored(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw === null ? fallback : raw
  } catch {
    return fallback
  }
}

export function writeStored(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(NS + key)
    else localStorage.setItem(NS + key, value)
  } catch {
    /* quota or private mode — the app degrades to session-only, not broken */
  }
}

export function readJson(key, fallback = null) {
  const raw = readStored(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  if (value === null || value === undefined) return writeStored(key, null)
  try {
    writeStored(key, JSON.stringify(value))
  } catch {
    /* unserialisable — ignore */
  }
}
