import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, RemoteDevice } from './types';

const DEVICES_KEY = '@antigravity_remote_devices_v1';
const SETTINGS_KEY = '@antigravity_remote_settings_v1';
const ACTIVE_ID_KEY = '@antigravity_remote_active_id_v1';

const DEFAULT_SETTINGS: AppSettings = {
  autoOpenOnLaunch: true,
  keepSessionsAlive: true,
};

export async function loadDevices(): Promise<RemoteDevice[]> {
  try {
    const raw = await AsyncStorage.getItem(DEVICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDevices(devices: RemoteDevice[]): Promise<void> {
  await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadActiveDeviceId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export async function saveActiveDeviceId(id: string | null): Promise<void> {
  if (id === null) {
    await AsyncStorage.removeItem(ACTIVE_ID_KEY);
  } else {
    await AsyncStorage.setItem(ACTIVE_ID_KEY, id);
  }
}

/**
 * Extracts and normalizes a remote URL from raw user input or pasted share text.
 */
export function normalizeRemoteUrl(raw: string): {
  valid: boolean;
  url: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { valid: false, url: '', error: '请输入远控链接' };
  }

  // If the user pasted a share message containing a URL, extract the first http(s) URL.
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  let candidate = urlMatch ? urlMatch[0] : trimmed;

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, url: '', error: '仅支持 http:// 或 https:// 链接' };
    }
    if (!parsed.hostname) {
      return { valid: false, url: '', error: '链接格式无效，缺少主机地址' };
    }
    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, url: '', error: '链接格式无效，请检查后重试' };
  }
}

export function formatRelativeTime(timestamp?: number): string {
  if (!timestamp) return '尚未使用';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return '刚刚';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} 天前`;
}

export function createDeviceId(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
