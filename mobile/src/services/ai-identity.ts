import AsyncStorage from '@react-native-async-storage/async-storage';
import { ensureSupabaseUser, isSupabaseConfigured } from './supabase';

const AI_OWNER_STORAGE_KEY = 'echonote_mobile_ai_owner_v1';

function generateLocalOwnerId() {
  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getAiOwnerId() {
  if (isSupabaseConfigured) {
    try {
      const user = await ensureSupabaseUser();
      if (user?.id) return String(user.id);
    } catch {}
  }

  const existing = await AsyncStorage.getItem(AI_OWNER_STORAGE_KEY);
  if (existing) return existing;

  const next = generateLocalOwnerId();
  await AsyncStorage.setItem(AI_OWNER_STORAGE_KEY, next);
  return next;
}
