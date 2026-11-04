// Router helpers without store access; the auth guard itself is in index.js.

// Accepts only in-app paths ("/cars/1"), never "//evil.com" or "https://…"
export const safeRedirect = (value) =>
  typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : null

export const setDocumentTitle = (to) => {
  const title = to.matched.findLast((record) => record.meta.title)?.meta.title
  document.title = title ? `${title} — Carshes` : 'Carshes'
}
