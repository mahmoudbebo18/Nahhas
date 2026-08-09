/**
 * Copy text to the clipboard, with a fallback for the WebViews this portal
 * actually runs in.
 *
 * `navigator.clipboard` only exists in a secure context, and site phones open
 * the portal from all sorts of places — a QR scanner's in-app browser, an old
 * Android WebView, occasionally a plain-http mirror. The hidden-textarea route
 * is the one that still works there, so the button never silently does nothing.
 *
 * Returns whether the text actually made it, so the caller can avoid claiming
 * "Copied" when nothing was.
 */
export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) return false

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return true
    }
  } catch {
    // Permission denied or a non-secure context — fall through.
  }

  try {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    // Off-screen but still focusable: `display:none` cannot be selected, and
    // a visible element would scroll the page under the engineer's thumb.
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    area.setSelectionRange(0, value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}
