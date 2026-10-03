// Runs fn when the page stops being used without a blur: switching or closing the
// app, Android back out of the app, a reload, or a service-worker update reload
// (which happens as the user leaves). Returns a function that stops listening.
export function onPageExit(fn, { document, window } = globalThis) {
  const onVisibility = () => { if (document.visibilityState === 'hidden') fn() }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', fn)
  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', fn)
  }
}
