/**
 * Date/time helpers.
 *
 * The API speaks two literal formats:
 *   date  → "YYYY-MM-DD"
 *   start/end → "YYYY-MM-DD HH:MM:SS"
 *
 * The contract does not state a timezone, so we send the engineer's local
 * wall-clock reading exactly as they typed it (a 08:00 site start is sent as
 * "08:00:00"). Odoo stores datetimes in UTC and converts on the user's tz, so
 * if the portal user's Odoo timezone is not set to site-local time, equipment
 * hours will land shifted. Flagged in the README.
 */

const pad = (n) => String(n).padStart(2, '0')

/** "YYYY-MM-DD" for right now, in the device's local timezone. */
export function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** "YYYY-MM-DDTHH:MM" — the value shape <input type="datetime-local"> wants. */
export function nowLocalInput(d = new Date()) {
  return `${todayISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Round to the nearest 5 minutes — nobody logs a plant start at 08:03. */
export function nowRounded(step = 5) {
  const d = new Date()
  d.setSeconds(0, 0)
  d.setMinutes(Math.round(d.getMinutes() / step) * step)
  return nowLocalInput(d)
}

/** datetime-local value → API "YYYY-MM-DD HH:MM:SS". */
export function toApiDateTime(value) {
  if (!value) return null
  const [date, time = '00:00'] = value.split('T')
  const parts = time.split(':')
  return `${date} ${pad(parts[0] ?? 0)}:${pad(parts[1] ?? 0)}:${pad(parts[2] ?? 0)}`
}

/** API "YYYY-MM-DD HH:MM:SS" → datetime-local value. */
export function fromApiDateTime(value) {
  if (!value) return ''
  return value.replace(' ', 'T').slice(0, 16)
}

/** Minutes between two datetime-local values; null if either is unparseable. */
export function minutesBetween(startValue, endValue) {
  if (!startValue || !endValue) return null
  const a = new Date(startValue).getTime()
  const b = new Date(endValue).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 60000)
}

/**
 * Human duration. The server computes the authoritative value and returns it
 * on the write response; this is only the live preview under the pickers.
 */
export function formatDuration(minutes, locale = 'en') {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return ''
  if (minutes < 0) return locale === 'ar' ? 'غير صالح' : 'invalid'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (locale === 'ar') {
    if (h && m) return `${h} س ${m} د`
    if (h) return `${h} س`
    return `${m} د`
  }
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

/** The API returns `duration` in hours (float). Render it the same way. */
export function formatDurationHours(hours, locale = 'en') {
  if (hours === null || hours === undefined || hours === '') return ''
  const n = Number(hours)
  if (Number.isNaN(n)) return String(hours)
  return formatDuration(Math.round(n * 60), locale)
}

/** Friendly date for confirmations — falls back to the raw string. */
export function formatDate(iso, locale = 'en') {
  if (!iso) return ''
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
