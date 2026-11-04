// Copies text to the clipboard. `navigator.clipboard` exists only on secure origins
// (HTTPS, localhost), so a hidden textarea + execCommand('copy') is the fallback.
// Resolves when the text was copied, rejects otherwise.
export const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // permission denied or not focused: try the fallback
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  const active = document.activeElement
  try {
    textarea.select()
    if (!document.execCommand?.('copy')) throw new Error('Copy is not supported')
  } finally {
    textarea.remove()
    active?.focus?.()
  }
}
