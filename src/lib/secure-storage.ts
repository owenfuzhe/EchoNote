/**
 * Wrapper around expo-secure-store for storing LLM API keys.
 * Falls back to localStorage on web (acceptable for dev; in prod use encryption).
 */
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const KEY_PREFIX = 'echonotes_'

export async function saveSecret(key: string, value: string): Promise<void> {
  const storageKey = KEY_PREFIX + key
  if (Platform.OS === 'web') {
    localStorage.setItem(storageKey, value)
  } else {
    await SecureStore.setItemAsync(storageKey, value)
  }
}

export async function loadSecret(key: string): Promise<string | null> {
  const storageKey = KEY_PREFIX + key
  if (Platform.OS === 'web') {
    return localStorage.getItem(storageKey)
  }
  return SecureStore.getItemAsync(storageKey)
}

export async function deleteSecret(key: string): Promise<void> {
  const storageKey = KEY_PREFIX + key
  if (Platform.OS === 'web') {
    localStorage.removeItem(storageKey)
  } else {
    await SecureStore.deleteItemAsync(storageKey)
  }
}
