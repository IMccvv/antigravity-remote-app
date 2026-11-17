import React from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppSettings, RemoteDevice } from '../types';
import { formatRelativeTime } from '../storage';

interface DeviceSwitcherModalProps {
  visible: boolean;
  devices: RemoteDevice[];
  activeDeviceId: string | null;
  mountedIds: string[];
  settings: AppSettings;
  onClose: () => void;
  onSelectDevice: (device: RemoteDevice) => void;
  onCloseSession: (deviceId: string) => void;
  onAddDevice: () => void;
  onEditDevice: (device: RemoteDevice) => void;
  onDeleteDevice: (deviceId: string) => void;
  onUpdateSettings: (next: AppSettings) => void;
}

export function DeviceSwitcherModal({
  visible,
  devices,
  activeDeviceId,
  mountedIds,
  settings,
  onClose,
  onSelectDevice,
  onCloseSession,
  onAddDevice,
  onEditDevice,
  onDeleteDevice,
  onUpdateSettings,
}: DeviceSwitcherModalProps) {
  const confirmDelete = (device: RemoteDevice) => {
    Alert.alert(
      '删除远控链接',
      `确定要删除「${device.name}」吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => onDeleteDevice(device.id),
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>切换远控电脑</Text>
              <Text style={styles.subtitle}>
                共 {devices.length} 台设备 · 点击即可秒切
              </Text>
            </View>
            <Pressable style={styles.addBtn} onPress={onAddDevice}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnText}>添加链接</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {devices.map((device) => {
              const isActive = device.id === activeDeviceId;
              const isMounted = mountedIds.includes(device.id);
              const isDefault = settings.defaultDeviceId === device.id;

              return (
                <Pressable
                  key={device.id}
                  style={[
                    styles.card,
                    isActive && {
                      borderColor: device.color,
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    },
                  ]}
                  onPress={() => onSelectDevice(device)}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTitleRow}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: device.color },
                        ]}
                      />
                      <Text style={styles.deviceName} numberOfLines={1}>
                        {device.name}
                      </Text>
                      {isActive && (
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: `${device.color}33` },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: device.color }]}
                          >
                            当前
                          </Text>
                        </View>
                      )}
                      {!isActive && isMounted && (
                        <View style={styles.aliveBadge}>
                          <Text style={styles.aliveBadgeText}>后台在线</Text>
                        </View>
                      )}
                      {isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>默认</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.cardActions}>
                      {!isActive && isMounted && (
                        <Pressable
                          onPress={() => onCloseSession(device.id)}
                          hitSlop={8}
                          style={styles.iconBtn}
                        >
                          <Ionicons
                            name="power-outline"
                            size={16}
                            color="#94A3B8"
                          />
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => onEditDevice(device)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name="create-outline"
                          size={16}
                          color="#94A3B8"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(device)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#F87171"
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.deviceUrl} numberOfLines={1}>
                    {device.url}
                  </Text>

                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>
                      {formatRelativeTime(device.lastUsedAt)}
                      {device.note ? ` · ${device.note}` : ''}
                    </Text>
                    <Pressable
                      onPress={() =>
                        onUpdateSettings({
                          ...settings,
                          defaultDeviceId: isDefault ? undefined : device.id,
                        })
                      }
                      hitSlop={6}
                    >
                      <Text style={styles.pinText}>
                        {isDefault ? '取消默认' : '设为默认'}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.settingsBox}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>打开 App 自动连接</Text>
                <Text style={styles.settingDesc}>
                  启动时自动打开默认或上次使用的电脑
                </Text>
              </View>
              <Switch
                value={settings.autoOpenOnLaunch}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, autoOpenOnLaunch: v })
                }
                trackColor={{ false: '#334155', true: '#2563EB' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingRow, { marginTop: 10 }]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>切换时保持后台连接</Text>
                <Text style={styles.settingDesc}>
                  切回已打开的电脑时无需重新加载页面
                </Text>
              </View>
              <Switch
                value={settings.keepSessionsAlive}
                onValueChange={(v) =>
                  onUpdateSettings({ ...settings, keepSessionsAlive: v })
                }
                trackColor={{ false: '#334155', true: '#2563EB' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    maxHeight: '84%',
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    maxHeight: 360,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  deviceName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aliveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aliveBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  deviceUrl: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metaText: {
    color: '#64748B',
    fontSize: 11,
    flex: 1,
    marginRight: 8,
  },
  pinText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '600',
  },
  settingsBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#1E293B',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  settingDesc: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
});
