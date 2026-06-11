const safeStorage = {
  getItem(key) {
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value) } catch {}
  },
  removeItem(key) {
    try { localStorage.removeItem(key) } catch {}
  },
}

export const safeSession = {
  getItem(key) {
    try { return sessionStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    try { sessionStorage.setItem(key, value) } catch {}
  },
}

export default safeStorage
