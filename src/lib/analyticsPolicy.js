// Only fixed campaign values and non-financial product events leave the device.
export const EVENT_FIELDS = {
  app_opened: ['return_session'], onboarding_started: [],
  onboarding_completed: ['country', 'language'], country_selected: ['country'],
  language_selected: ['language'], feature_opened: ['feature'],
  first_useful_action_completed: ['feature', 'action'],
  scam_question_answered: ['question', 'correct'], scam_quiz_completed: ['score', 'total'],
  guest_mode_selected: [], login: ['method'], signup: ['method', 'awaiting_confirmation'],
  chat_message_sent: [], chat_response_received: [], chat_failed: [],
  budget_updated: ['expense_count'], savings_goal_created: [],
  remittance_compared: ['destination_country'],
}
export function campaignFromSearch(search) {
  const params = new URLSearchParams(search)
  return params.get('source') === 'the-leo' && params.get('channel') === 'workshop'
    ? { source: 'the-leo', channel: 'workshop' } : {}
}
export function safeEventProperties(event, properties = {}) {
  return Object.fromEntries((EVENT_FIELDS[event] || []).filter(key =>
    ['string', 'number', 'boolean'].includes(typeof properties[key]) &&
    (key !== 'feature' || ['/', '/login', '/savings', '/budget', '/remittance', '/more', '/salary', '/loans', '/scams', '/loanshark', '/emergency', '/chat', '/scam-quiz', '/emergency-fund', '/banking-guide', '/privacy', '/terms', '/delete-account', 'scam-quiz'].includes(properties[key]))
  ).map(key => [key, properties[key]]))
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
