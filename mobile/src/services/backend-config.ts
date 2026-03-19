import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKEND_KEY = 'echonote_mobile_backend';
export const DEFAULT_BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://echonote-api-b1q9.onrender.com';

export async function getBackendUrl() {
  const saved = await AsyncStorage.getItem(BACKEND_KEY);
  return saved || DEFAULT_BACKEND;
}
