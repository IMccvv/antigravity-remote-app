export interface RemoteDevice {
  id: string;
  name: string;
  url: string;
  color: string;
  note?: string;
  createdAt: number;
  lastUsedAt?: number;
}

export interface AppSettings {
  autoOpenOnLaunch: boolean;
  keepSessionsAlive: boolean;
  defaultDeviceId?: string;
}

export const DEVICE_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
] as const;

export const NAME_PRESETS = [
  '实验室台式机',
  '宿舍笔记本',
  '公司电脑',
  '家里主机',
  '服务器',
] as const;
