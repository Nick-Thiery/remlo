import safeStorage, { safeSession } from './safeStorage.js'
import { campaignFromSearch, EVENT_FIELDS, safeEventProperties, sanitizeCapture } from './analyticsPolicy.js'

let posthog
let enabled = false
const queue = []
let campaign = {}

export async function initAnalytics() {
  const incoming = campaignFromSearch(window.location.search)
  if (incoming.source) safeSession.setItem('remlo_campaign', 'the-leo')
  campaign = safeSession.getItem('remlo_campaign') === 'the-leo'
    ? { source: 'the-leo', channel: 'workshop' } : {}
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  enabled = true
  try {
    // Analytics is optional and must not block the first screen.
    const module = await import('posthog-js')
    posthog = module.default
    posthog.init(key, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
      autocapture: false, capture_pageview: false, capture_pageleave: false,
      capture_exceptions: false, disable_session_recording: true,
      disable_surveys: true, disable_external_dependency_loading: true,
      advanced_disable_flags: true, person_profiles: 'never', ip: false,
      save_referrer: false, save_campaign_params: false,
      // Drop URLs, referrers, auth tokens and legacy persisted financial fields.
      before_send: (event) => sanitizeCapture(event, campaign),
    })
    if (!safeStorage.getItem('remlo_analytics_privacy_v2')) {
      posthog.reset()
      safeStorage.setItem('remlo_analytics_privacy_v2', 'true')
    }
    for (const [event, properties] of queue.splice(0)) track(event, properties)
  } catch {
    enabled = false
    posthog = undefined
    queue.length = 0
  }
}

export function track(event, properties = {}) {
  if (!enabled || !Object.hasOwn(EVENT_FIELDS, event)) return
  const safe = safeEventProperties(event, properties)
  if (!posthog) {
    if (queue.length < 30) queue.push([event, safe])
    return
  }
  try { posthog.capture(event, { ...safe, ...campaign }) }
  catch { /* Optional telemetry must never break a user action. */ }
}

export function trackActivation() {
  if (safeStorage.getItem('remlo_activated') === 'true') return
  safeStorage.setItem('remlo_activated', 'true')
  track('first_useful_action_completed', { feature: 'scam-quiz', action: 'answer_and_view_explanation' })
}
