import { useEffect, useState } from 'react'

const GFX_STORAGE_PREFIX = 'ghostfinex.v1.'

/**
 * useState synced to localStorage so the prototype survives reloads.
 * Falls back to in-memory state when storage is unavailable (private mode).
 */
export function useLocalStorageState(key, initialValue) {
  const storageKey = GFX_STORAGE_PREFIX + key
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw === null ? initialValue : JSON.parse(raw)
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* storage unavailable — keep working in memory */
    }
  }, [storageKey, value])

  return [value, setValue]
}
