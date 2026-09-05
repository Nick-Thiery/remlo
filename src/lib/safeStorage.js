// Keep this session usable when private browsing or a full disk blocks storage.
// Memory is a fallback only; it cannot preserve data after closing the page.
export function createSafeStorage(getStorage) {
  const memory = new Map()
  return {
    getItem(key) {
      if (memory.has(key)) return memory.get(key)
      try { return getStorage().getItem(key) } catch { return null }
    },
    setItem(key, value) {
      try { getStorage().setItem(key, String(value)); memory.delete(key) }
      catch { memory.set(key, String(value)) }
    },
    removeItem(key) {
      try { getStorage().removeItem(key); memory.delete(key) }
      catch { memory.set(key, null) }
    },
    clear() {
      // Account cleanup must not erase other applications' origin storage.
      const keys = new Set(memory.keys())
      try {
        const storage = getStorage()
        for (let i = 0; i < storage.length; i++) keys.add(storage.key(i))
      } catch { /* inaccessible storage is already unavailable */ }
      for (const key of keys) if (key?.startsWith('remlo_')) this.removeItem(key)
    },
  }
}

const safeStorage = createSafeStorage(() => localStorage)
export const safeSession = createSafeStorage(() => sessionStorage)

export default safeStorage
