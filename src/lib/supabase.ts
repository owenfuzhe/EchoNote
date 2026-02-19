import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Guard against SSR — expo-router runs a Node.js server pass where localStorage doesn't exist
const canUseLocalStorage = typeof window !== 'undefined' && typeof localStorage !== 'undefined'

// Web fallback: localStorage. Native: SecureStore (device keychain).
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') return canUseLocalStorage ? localStorage.getItem(key) : null
    return SecureStore.getItemAsync(key)
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') { if (canUseLocalStorage) localStorage.setItem(key, value); return }
    SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') { if (canUseLocalStorage) localStorage.removeItem(key); return }
    SecureStore.deleteItemAsync(key)
  },
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
