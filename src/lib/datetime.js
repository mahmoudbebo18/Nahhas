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

/** The UI language mapped to the tag Intl actually wants. */
const intlLocale = (locale) => (locale === 'ar' ? 'ar-EG' : 'en-GB')

/** Friendly date for confirmations — falls back to the raw string. */
export function formatDate(iso, locale = 'en') {
  if (!iso) return ''
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleDateString(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Label for a datetime-local value: "3 Aug 2026 · 08:00".
 *
 * The clock stays 24-hour and un-localised on purpose. Site logs are read back
 * against a shift, and "08:00" is unambiguous in a way that a locale's 12-hour
 * form with a translated AM/PM is not.
 */
export function formatDateTime(value, locale = 'en') {
  if (!value) return ''
  const [date, time = ''] = String(value).split('T')
  const shown = formatDate(date, locale)
  return time ? `${shown} · ${time.slice(0, 5)}` : shown
}

/* -- calendar grid --------------------------------------------------------- */

/**
 * First day of the week, by UI language. Arabic-speaking sites run a
 * Saturday-start week; the English screens follow the ISO Monday start.
 * 0 = Sunday, to match `Date#getDay`.
 */
export const weekStartFor = (locale) => (locale === 'ar' ? 6 : 1)

/**
 * Local-midnight Date from "YYYY-MM-DD" (or the date half of a datetime).
 *
 * Built field-by-field rather than by `new Date("2026-08-03")`, which the spec
 * parses as *UTC* midnight — east of Greenwich that renders as the 2nd, so the
 * calendar would highlight the wrong day for half the world.
 */
export function parseISODate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

export const isSameDay = (a, b) =>
  Boolean(a && b) &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

/** Shift a Date by whole days, staying on local midnight. */
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Shift by whole months, clamping the day (31 Jan + 1 month → 28/29 Feb). */
export function addMonths(d, n) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), lastDay))
}

/**
 * The block a month is drawn in, including the neighbouring days that pad it
 * out. Always six rows: a grid that changes height between months makes the
 * whole panel — and on a phone the page under it — jump on every arrow tap.
 */
export function monthGrid(year, month, weekStart = 1) {
  const lead = (new Date(year, month, 1).getDay() - weekStart + 7) % 7
  const first = new Date(year, month, 1 - lead)
  return Array.from({ length: 42 }, (_, i) => addDays(first, i))
}

/**
 * Weekday headings in the UI language, rotated to that language's week start.
 *
 * The width differs by script because the conventions do. English `narrow`
 * collapses to "S M T W T F S" — two S and two T, which is worse than useless
 * in a grid — so it takes `short`. Arabic `short` is the opposite problem
 * ("الأربعاء" in a 44px column), and single letters are what an Arabic
 * calendar prints anyway.
 */
export function weekdayLabels(locale, weekStart = 1) {
  const fmt = new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: locale === 'ar' ? 'narrow' : 'short',
  })
  // 2024-01-07 was a Sunday, so the offset lines up with `getDay()`.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 0, 7 + ((weekStart + i) % 7))),
  )
}

/** "August 2026" / "أغسطس ٢٠٢٦" for the calendar header. */
export const monthLabel = (d, locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric' }).format(d)

/** A day number in the UI language's digits (Arabic-Indic under `ar`). */
export const dayNumber = (d, locale) =>
  new Intl.NumberFormat(intlLocale(locale)).format(d.getDate())

/** Full date, spoken form — for the day cells' accessible names. */
export const dayLabel = (d, locale) =>
  new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'full' }).format(d)
