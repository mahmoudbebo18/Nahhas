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
 * Rendering server data is `<Bidi>{project.name}</Bidi>` — see
 * src/components/Bidi.jsx for why it is an element rather than a `dir`
 * attribute spread onto the paragraph.
 */

/**
 * Fold Arabic-Indic (٠١٢…) and Persian (۰۱۲…) digits down to ASCII, plus the
 * Arabic decimal separator "٫" and thousands mark "٬".
 *
 * An Arabic keypad emits U+0660–0669, which `\d` does not match and `Number()`
 * does not parse — so without this an engineer typing a quantity on an Arabic
 * keyboard has every keystroke silently rejected.
 */
export function toLatinDigits(value) {
  return String(value ?? '').replace(/[٠-٩۰-۹٫٬]/g, (ch) => {
    if (ch === '٫') return '.'
    if (ch === '٬') return ''
    const code = ch.charCodeAt(0)
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660
    return String(code - base)
  })
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
