import posthog from 'posthog-js'

let initialized = false

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

  if (!key) {
    console.warn('PostHog: VITE_POSTHOG_KEY is not set — tracking disabled')
    return
  }

  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
  })

  initialized = true
}

export function identifyUser(userId) {
  if (!initialized) return
  posthog.identify(userId)
}

export function track(event, properties) {
  if (!initialized) return
  posthog.capture(event, properties)
}
