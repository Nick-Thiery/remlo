// The service worker serves the cached app shell, so an open page keeps the build
// it started with until it reloads. Check for a new deploy on launch, on return to
// the app and hourly, then reload only when it cannot interrupt a task: before the
// first tap or keypress, or as the user leaves the app. Storage is never touched.
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

export function registerServiceWorker({ navigator, document, window } = globalThis) {
  if (!navigator?.serviceWorker) return
  const sw = navigator.serviceWorker
  let registration = null
  let controlled = !!sw.controller
  let interacted = false
  let reloadPending = false
  let reloading = false

  const reload = () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  }
  const checkForUpdate = () => { registration?.update().catch(() => {}) }
  const markInteracted = () => { interacted = true }
  window.addEventListener('pointerdown', markInteracted, { capture: true, passive: true })
  window.addEventListener('keydown', markInteracted, { capture: true, passive: true })

  sw.addEventListener('controllerchange', () => {
    // A device's first worker takes control of the page it installed from; nothing to replace.
    if (!controlled) { controlled = true; return }
    if (document.visibilityState !== 'visible' || !interacted) reload()
    else reloadPending = true
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate()
    else if (reloadPending) reload()
  })

  window.addEventListener('load', () => {
    sw.register('/sw.js', { scope: '/' }).then((r) => {
      registration = r
      checkForUpdate()
      window.setInterval(() => { if (document.visibilityState === 'visible') checkForUpdate() }, UPDATE_CHECK_INTERVAL_MS)
    }).catch(() => { /* No offline support this visit; the app still works online. */ })
  })
}
