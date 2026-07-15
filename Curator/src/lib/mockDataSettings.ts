import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "curator.mock_data_enabled";

let cachedEnabled = false;
let cacheLoaded = false;

export function isMockUserId(userId: string) {
  return userId.startsWith("mock-");
}

export async function loadMockDataSetting(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cachedEnabled = stored === "true";
  } catch {
    cachedEnabled = false;
  }

  cacheLoaded = true;
  return cachedEnabled;
}

export function isMockDataEnabled() {
  return cachedEnabled;
}

export function isMockDataSettingLoaded() {
  return cacheLoaded;
}

export async function setMockDataEnabled(enabled: boolean) {
  cachedEnabled = enabled;
  cacheLoaded = true;
  await AsyncStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}
