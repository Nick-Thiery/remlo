import { QUIZ_VERSION } from './scamQuiz.js'

// Only fixed campaign values and non-financial product events leave the device.
export const EVENT_FIELDS = {
  app_opened: ['return_session'], onboarding_started: [],
  onboarding_completed: ['country', 'language'], country_selected: ['country'],
  language_selected: ['language'], feature_opened: ['feature'],
  first_useful_action_completed: ['feature', 'action', 'activation_version'],
  scam_question_answered: ['question', 'correct', 'quiz_version'],
  scam_quiz_completed: ['score', 'total', 'quiz_version'],
  guest_mode_selected: [], login: ['method'], signup: ['method', 'awaiting_confirmation'],
  chat_message_sent: [], chat_response_received: [], chat_failed: [],
  budget_updated: ['expense_count'], savings_goal_created: [],
  remittance_compared: ['destination_country'],
}

// Activation v2 (from 18 Sep 2026): the first time a device completes a core
// feature task, taken from that feature's existing completion event. v1 events
// have no activation_version and action 'answer_and_view_explanation'; they fired
// on the first scam answer, which scam_question_answered still records.
export const ACTIVATION_VERSION = 2
export const ACTIVATION_STORAGE_KEY = 'remlo_activated_v2'
export const ACTIVATING_EVENTS = {
  scam_quiz_completed: { feature: 'scam-quiz', action: 'quiz_completed' },
  chat_response_received: { feature: 'chat', action: 'response_received' },
  savings_goal_created: { feature: 'savings', action: 'goal_created' },
  remittance_compared: { feature: 'remittance', action: 'rates_compared' },
  // Blurring an empty income field also saves; a budget only produces a plan once
  // it has income. The amount is checked on the device and never sent.
  budget_updated: { feature: 'budget', action: 'budget_saved', when: (p) => p.income > 0 },
}

// Fixed values accepted for these fields; anything else (e.g. unknown route text) is dropped.
const ALLOWED_VALUES = {
  feature: ['/', '/login', '/savings', '/budget', '/remittance', '/more', '/salary', '/loans', '/scams', '/loanshark', '/emergency', '/chat', '/scam-quiz', '/emergency-fund', '/banking-guide', '/privacy', '/terms', '/delete-account', ...Object.values(ACTIVATING_EVENTS).map(a => a.feature)],
  action: Object.values(ACTIVATING_EVENTS).map(a => a.action),
  activation_version: [ACTIVATION_VERSION],
  quiz_version: [QUIZ_VERSION],
}

export function campaignFromSearch(search) {
  const params = new URLSearchParams(search)
  return params.get('source') === 'the-leo' && params.get('channel') === 'workshop'
    ? { source: 'the-leo', channel: 'workshop' } : {}
}
export function safeEventProperties(event, properties = {}) {
  return Object.fromEntries((EVENT_FIELDS[event] || []).filter(key =>
    ['string', 'number', 'boolean'].includes(typeof properties[key]) &&
    (!Object.hasOwn(ALLOWED_VALUES, key) || ALLOWED_VALUES[key].includes(properties[key]))
  ).map(key => [key, properties[key]]))
}

// The events one product action sends: itself, plus the one-time activation
// event the first time this device completes a core feature task.
export function eventsToCapture(event, properties, storage) {
  if (!Object.hasOwn(EVENT_FIELDS, event)) return []
  const events = [[event, safeEventProperties(event, properties)]]
  const activation = ACTIVATING_EVENTS[event]
  if (activation && (!activation.when || activation.when(properties)) &&
      storage.getItem(ACTIVATION_STORAGE_KEY) !== 'true') {
    storage.setItem(ACTIVATION_STORAGE_KEY, 'true')
    events.push(['first_useful_action_completed', safeEventProperties('first_useful_action_completed', {
      feature: activation.feature, action: activation.action, activation_version: ACTIVATION_VERSION,
    })])
  }
  return events
}

// Keep the SDK's public project token and anonymous/session IDs required for ingest.
export function sanitizeCapture(event, campaign = {}) {
  if (!event || !Object.hasOwn(EVENT_FIELDS, event.event)) return null
  const properties = event.properties || {}
  return {
    uuid: event.uuid, event: event.event, timestamp: event.timestamp,
    properties: {
      ...safeEventProperties(event.event, properties), ...campaign,
      token: properties.token,
      distinct_id: properties.distinct_id,
      $session_id: properties.$session_id,
      $process_person_profile: false, $geoip_disable: true,
    },
  }
}
