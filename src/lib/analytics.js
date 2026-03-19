import posthog from 'posthog-js'

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    autocapture: false,
    capture_pageview: false,
  })
}

export function identifyUser(userId) {
  posthog.identify(userId)
}

export function track(event, properties) {
  posthog.capture(event, properties)
}
