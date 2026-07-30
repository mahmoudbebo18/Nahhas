/**
 * Avenir Arabic wiring.
 *
 * The licensed font is dropped in by hand at
 *   src/assets/fonts/avenir-arabic-light.otf
 * and is gitignored. A plain `@font-face { src: url('../assets/fonts/…') }`
 * in CSS would make Vite fail the build whenever that file is absent, which
 * would block anyone who just cloned the repo.
 *
 * `import.meta.glob` is resolved at build time and simply returns `{}` when
 * nothing matches — no error, no warning. So we glob for the file, and only
 * register the @font-face if it actually resolved. Absent, Arabic text falls
 * back to Tahoma/system Arabic and the app is otherwise identical.
 */

const candidates = import.meta.glob(
  '../assets/fonts/avenir-arabic-light.{otf,ttf,woff2,woff}',
  { eager: true, query: '?url', import: 'default' },
)

// Arabic, Arabic Supplement, Extended-A, Presentation Forms A/B, plus the
// Arabic-Indic digits. Scoping the face means Latin text can never be pulled
// into Avenir Arabic even if the file happens to carry Latin glyphs.
const ARABIC_RANGE = [
  'U+0600-06FF',
  'U+0750-077F',
  'U+08A0-08FF',
  'U+FB50-FDFF',
  'U+FE70-FEFF',
  'U+200C-200E',
  'U+2010-2011',
  'U+204F',
  'U+2E41',
].join(', ')

const FORMAT = { otf: 'opentype', ttf: 'truetype', woff2: 'woff2', woff: 'woff' }

/** Returns true when the licensed face was found and registered. */
export function installArabicFont() {
  const [href] = Object.values(candidates)
  if (!href) return false

  const ext = href.split('?')[0].split('.').pop().toLowerCase()
  const style = document.createElement('style')
  style.dataset.font = 'avenir-arabic'
  style.textContent = `
@font-face {
  font-family: 'Avenir Arabic';
  src: url('${href}') format('${FORMAT[ext] || 'opentype'}');
  font-weight: 300 500;
  font-style: normal;
  font-display: swap;
  unicode-range: ${ARABIC_RANGE};
}`
  document.head.appendChild(style)
  return true
}
