import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LLMProviderId, ProviderConfig, PROVIDER_META } from '@/providers/llm/types'
import { saveSecret, loadSecret } from '@/lib/secure-storage'

interface SettingsState {
  // Active provider used for AI processing
  activeProviderId: LLMProviderId
  // Provider configs (no API keys — stored in SecureStore separately)
  providers: Record<LLMProviderId, Omit<ProviderConfig, 'apiKey'>>
  // Voice settings
  voiceLanguage: 'zh' | 'en' | 'auto'
  voiceTranscriptionProvider: 'openai_whisper' | 'zai_asr' | 'device' | 'active_llm'
  // Theme
  theme: 'light' | 'dark' | 'system'

  // Actions
  setActiveProvider: (id: LLMProviderId) => void
  updateProviderModel: (id: LLMProviderId, model: string) => void
  updateProviderBaseUrl: (id: LLMProviderId, baseUrl: string) => void
  setVoiceLanguage: (lang: 'zh' | 'en' | 'auto') => void
  setVoiceTranscriptionProvider: (provider: 'openai_whisper' | 'zai_asr' | 'device' | 'active_llm') => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

const defaultProviders = Object.fromEntries(
  (Object.keys(PROVIDER_META) as LLMProviderId[]).map((id) => [
    id,
    {
      id,
      model: PROVIDER_META[id].defaultModel,
      enabled: id === 'anthropic',
      baseUrl: id === 'ollama' ? 'http://localhost:11434' : undefined,
    },
  ])
) as Record<LLMProviderId, Omit<ProviderConfig, 'apiKey'>>

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      activeProviderId: 'anthropic',
      providers: defaultProviders,
      voiceLanguage: 'auto',
      voiceTranscriptionProvider: 'openai_whisper',
      theme: 'system',

      setActiveProvider: (id) => set({ activeProviderId: id }),

      updateProviderModel: (id, model) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: { ...s.providers[id], model },
          },
        })),

      updateProviderBaseUrl: (id, baseUrl) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: { ...s.providers[id], baseUrl },
          },
        })),

      setVoiceLanguage: (lang) => set({ voiceLanguage: lang }),

      setVoiceTranscriptionProvider: (provider) => set({ voiceTranscriptionProvider: provider }),

      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'echonotes-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// API key helpers — check environment variables first, then SecureStore
export const providerKeyStorageId = (id: LLMProviderId) => `provider_key_${id}`

const ENV_KEY_MAP: Record<LLMProviderId, string> = {
  anthropic: 'EXPO_PUBLIC_ANTHROPIC_API_KEY',
  openai: 'EXPO_PUBLIC_OPENAI_API_KEY',
  kimi: 'EXPO_PUBLIC_KIMI_API_KEY',
  qwen: 'EXPO_PUBLIC_QWEN_API_KEY',
  zai: 'EXPO_PUBLIC_ZAI_API_KEY',
  ollama: '',
}

export async function saveProviderApiKey(id: LLMProviderId, key: string) {
  await saveSecret(providerKeyStorageId(id), key)
}

export async function loadProviderApiKey(id: LLMProviderId): Promise<string | null> {
  const envKey = ENV_KEY_MAP[id]
  
  // Check window.importMetaEnv for web build
  if (typeof window !== 'undefined' && (window as any).importMetaEnv) {
    const globalEnv = (window as any).importMetaEnv
    if (envKey && globalEnv[envKey]) {
      return globalEnv[envKey]
    }
  }
  
  // Check import.meta.env for other environments
  if (envKey && typeof import.meta !== 'undefined' && import.meta.env?.[envKey]) {
    return import.meta.env[envKey]
  }
  
  // Fallback to secure storage
  return loadSecret(providerKeyStorageId(id))
}
