/** Small JSON wrapper around localStorage that never throws (private mode, quota, corrupted data). */

const PREFIX = '5proti5:'

export function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn(`Nepodarilo sa uložiť „${key}“ do localStorage`, e)
  }
}

export const storageKey = (key: string) => PREFIX + key
