import { hasArabic } from '@/lib/text'

/**
 * Wraps a piece of server data — a project name, a task, a product — so it
 * renders in its own script's order without dragging the layout with it.
 *
 * Why an element and not a `dir` attribute on the paragraph:
 *
 * `dir` on a block sets that block's *direction*, and direction is what an
 * inherited `text-align: start` resolves against. So `<p dir="ltr">` inside an
 * Arabic row did not just order the characters — it left-aligned the whole
 * line, which is why an English project name sat on the wrong side of every
 * RTL list row.
 *
 * `<bdi>` carries `unicode-bidi: isolate` from the UA stylesheet and defaults
 * to `dir="auto"`. Isolation means the neutral characters at the edges of this
 * run — the brackets in "(AL DOL)", a trailing "·" — resolve against the run
 * instead of leaking into the surrounding line, which is the actual bug `dir`
 * was there to prevent. And because it is inline, it cannot reach the block's
 * text-align at all: the row stays aligned with the UI in both languages.
 *
 * `auto` is enough on its own. It finds the first character of *strong*
 * directionality and ignores digits, so "3 أدوار" resolves RTL — the case an
 * earlier version of this file wrongly assumed it got wrong, and used as the
 * reason to hard-code `dir`.
 *
 * `lang` is still worth setting: it is what screen readers switch voice on.
 */
export default function Bidi({ children, className }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <bdi className={className} lang={hasArabic(children) ? 'ar' : 'en'}>
      {children}
    </bdi>
  )
}
