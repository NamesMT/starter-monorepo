/**
 * Copies text to the clipboard and reports whether it actually succeeded.
 *
 * `navigator.clipboard.writeText` needs a focused, secure document and can reject
 * silently (notably inside dialogs / some Chromium versions), so we fall back to a
 * focused textarea + `document.execCommand('copy')` and return its real result.
 *
 * Callers must only show a "copied" state when this resolves `true` — VueUse's
 * `useClipboard` sets `copied` even when both paths fail, which is why the check
 * animation could fire while nothing was copied.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    }
    catch {
      // Fall through to the legacy path below.
    }
  }

  if (typeof document === 'undefined')
    return false

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.width = '1px'
    textarea.style.height = '1px'
    textarea.style.opacity = '0'

    const activeElement = document.activeElement as HTMLElement | null

    document.body.appendChild(textarea)
    // Focus is required for `execCommand('copy')` to work in Chromium; without it the
    // call returns `false` and the clipboard is left untouched.
    textarea.focus({ preventScroll: true })
    textarea.select()
    textarea.setSelectionRange(0, text.length)

    const succeeded = document.execCommand('copy')

    textarea.remove()
    activeElement?.focus?.({ preventScroll: true })

    return succeeded
  }
  catch {
    return false
  }
}
