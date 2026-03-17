import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKEND_KEY = 'echonote_mobile_backend';
export const DEFAULT_BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.50.197:8000';

export async function getBackendUrl() {
  const saved = await AsyncStorage.getItem(BACKEND_KEY);
  return saved || DEFAULT_BACKEND;
}
