/**
 * Bidirectional-text helpers.
 *
 * Project and task names come from Odoo in either script — "Tower B — Floor 03"
 * next to "بند عمل 1" — often in the same list. We tag each piece of data with
 * its own direction so an Arabic name inside an English UI (and vice versa)
 * renders with correct punctuation placement instead of dangling brackets.
 */

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/

export const hasArabic = (value) => ARABIC.test(String(value ?? ''))

/**
 * Spread onto any element rendering server data:
 *   <span {...bidi(project.name)}>{project.name}</span>
 *
 * `dir` is explicit rather than "auto" because "auto" only looks at the first
 * strong character — "3 أدوار" would be treated as LTR.
 */
export function bidi(value) {
  return hasArabic(value) ? { dir: 'rtl', lang: 'ar' } : { dir: 'ltr', lang: 'en' }
}

/** Case/diacritic-tolerant needle match for the product search boxes. */
export function matches(haystack, needle) {
  if (!needle) return true
  return normalise(haystack).includes(normalise(needle))
}

function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ْٰ]/g, '') // Arabic diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '') // tatweel
    .trim()
}

/**
 * Odoo selection fields arrive as raw technical values ("in_progress").
 * Only touch ASCII snake_case — an Arabic label is already human-readable.
 */
export function humanise(value) {
  const text = String(value ?? '').trim()
  if (!text || !/^[a-z0-9_]+$/i.test(text)) return text
  return text
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a number for display without dragging in a formatting library. */
export function formatNumber(value, locale = 'en') {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  if (Number.isNaN(n)) return String(value)
  return n.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 3,
  })
}
