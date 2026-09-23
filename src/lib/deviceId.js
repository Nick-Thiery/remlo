import safeStorage from './safeStorage.js'

// A random id for this install, used only so the chat backend can count
// messages per device instead of per IP address — a dormitory shares one
// connection, and an IP quota would lock everyone out at once. It is not sent
// to analytics, carries nothing about the person, and a worker who clears
// their browser data simply gets a new one.
const DEVICE_ID_KEY = 'remlo_device_id'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function newId() {
  try {
    return crypto.randomUUID()
  } catch {
    // Older WebViews without randomUUID still need a well-formed id.
    const hex = [...crypto.getRandomValues(new Uint8Array(16))]
      .map(byte => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
  }
}

export function getDeviceId() {
  const stored = safeStorage.getItem(DEVICE_ID_KEY)
  if (UUID.test(stored ?? '')) return stored

  const id = newId()
  safeStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export { DEVICE_ID_KEY }
