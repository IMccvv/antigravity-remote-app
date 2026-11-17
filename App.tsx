import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppSettings, RemoteDevice } from './src/types';
import {
  formatRelativeTime,
  loadActiveDeviceId,
  loadDevices,
  loadSettings,
  normalizeRemoteUrl,
  saveActiveDeviceId,
  saveDevices,
  saveSettings,
} from './src/storage';
import { DeviceFormModal } from './src/components/DeviceFormModal';
import { DeviceSwitcherModal } from './src/components/DeviceSwitcherModal';
import {
  RemoteWebViewHandle,
  RemoteWebViewPane,
} from './src/components/RemoteWebViewPane';

const MAX_ALIVE_SESSIONS = 4;

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

function MainApp() {
  const [ready, setReady] = useState(false);
  const [devices, setDevices] = useState<RemoteDevice[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    autoOpenOnLaunch: true,
    keepSessionsAlive: true,
  });
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [mountedIds, setMountedIds] = useState<string[]>([]);
  const [barCollapsed, setBarCollapsed] = useState(false);

  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingDevice, setEditingDevice] = useState<RemoteDevice | null>(null);
  const [clipboardDraftUrl, setClipboardDraftUrl] = useState<string | undefined>(
    undefined
  );

  const webViewRefs = useRef<Record<string, RemoteWebViewHandle | null>>({});

  // Initial load & auto-open
  useEffect(() => {
    (async () => {
      const [loadedDevices, loadedSettings, lastActiveId] = await Promise.all([
        loadDevices(),
        loadSettings(),
        loadActiveDeviceId(),
      ]);

      setDevices(loadedDevices);
      setSettings(loadedSettings);

      if (loadedDevices.length > 0 && loadedSettings.autoOpenOnLaunch) {
        const targetId =
          (loadedSettings.defaultDeviceId &&
            loadedDevices.some((d) => d.id === loadedSettings.defaultDeviceId) &&
            loadedSettings.defaultDeviceId) ||
          (lastActiveId &&
            loadedDevices.some((d) => d.id === lastActiveId) &&
            lastActiveId) ||
          loadedDevices[0].id;

        const now = Date.now();
        const updated = loadedDevices.map((d) =>
          d.id === targetId ? { ...d, lastUsedAt: now } : d
        );
        setDevices(updated);
        saveDevices(updated).catch(() => {});
        setActiveDeviceId(targetId);
        setMountedIds([targetId]);
        saveActiveDeviceId(targetId).catch(() => {});
      }

      setReady(true);
    })();
  }, []);

  const activeDevice = useMemo(
    () => devices.find((d) => d.id === activeDeviceId) ?? null,
    [devices, activeDeviceId]
  );

  const connectToDevice = useCallback(
    (device: RemoteDevice) => {
      const now = Date.now();
      setDevices((prev) => {
        const next = prev.map((d) =>
          d.id === device.id ? { ...d, lastUsedAt: now } : d
        );
        saveDevices(next).catch(() => {});
        return next;
      });

      setActiveDeviceId(device.id);
      saveActiveDeviceId(device.id).catch(() => {});

      setMountedIds((prev) => {
        if (!settings.keepSessionsAlive) {
          return [device.id];
        }
        const without = prev.filter((id) => id !== device.id);
        const next = [...without, device.id];
        if (next.length > MAX_ALIVE_SESSIONS) {
          return next.slice(next.length - MAX_ALIVE_SESSIONS);
        }
        return next;
      });

      setSwitcherVisible(false);
    },
    [settings.keepSessionsAlive]
  );

  const cycleDevice = useCallback(
    (direction: 1 | -1) => {
      if (devices.length <= 1 || !activeDeviceId) return;
      const idx = devices.findIndex((d) => d.id === activeDeviceId);
      if (idx === -1) return;
      const nextIdx = (idx + direction + devices.length) % devices.length;
      connectToDevice(devices[nextIdx]);
    },
    [devices, activeDeviceId, connectToDevice]
  );

  // Android hardware back button handling
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (formVisible) {
        setFormVisible(false);
        return true;
      }
      if (switcherVisible) {
        setSwitcherVisible(false);
        return true;
      }
      if (activeDeviceId) {
        const handledByWeb = webViewRefs.current[activeDeviceId]?.goBack();
        if (handledByWeb) return true;
        if (barCollapsed) {
          setBarCollapsed(false);
          return true;
        }
        setActiveDeviceId(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [formVisible, switcherVisible, activeDeviceId, barCollapsed]);

  const handleSaveDevice = useCallback(
    (device: RemoteDevice, connectNow: boolean) => {
      setDevices((prev) => {
        const exists = prev.some((d) => d.id === device.id);
        const next = exists
          ? prev.map((d) => (d.id === device.id ? device : d))
          : [device, ...prev];
        saveDevices(next).catch(() => {});
        return next;
      });

      setFormVisible(false);
      setEditingDevice(null);
      setClipboardDraftUrl(undefined);

      if (connectNow) {
        connectToDevice(device);
      }
    },
    [connectToDevice]
  );

  const handleDeleteDevice = useCallback(
    (deviceId: string) => {
      setDevices((prev) => {
        const next = prev.filter((d) => d.id !== deviceId);
        saveDevices(next).catch(() => {});
        return next;
      });

      setMountedIds((prev) => prev.filter((id) => id !== deviceId));

      if (settings.defaultDeviceId === deviceId) {
        const nextSettings = { ...settings, defaultDeviceId: undefined };
        setSettings(nextSettings);
        saveSettings(nextSettings).catch(() => {});
      }

      if (activeDeviceId === deviceId) {
        setActiveDeviceId(null);
        saveActiveDeviceId(null).catch(() => {});
      }
    },
    [activeDeviceId, settings]
  );

  const handleCloseSession = useCallback((deviceId: string) => {
    setMountedIds((prev) => prev.filter((id) => id !== deviceId));
  }, []);

  const handleUpdateSettings = useCallback((next: AppSettings) => {
    setSettings(next);
    saveSettings(next).catch(() => {});
    if (!next.keepSessionsAlive) {
      setMountedIds((prev) =>
        activeDeviceId && prev.includes(activeDeviceId) ? [activeDeviceId] : []
      );
    }
  }, [activeDeviceId]);

  const openAddModal = useCallback((prefillUrl?: string) => {
    setEditingDevice(null);
    setClipboardDraftUrl(prefillUrl);
    setSwitcherVisible(false);
    setFormVisible(true);
  }, []);

  const openEditModal = useCallback((device: RemoteDevice) => {
    setEditingDevice(device);
    setClipboardDraftUrl(undefined);
    setSwitcherVisible(false);
    setFormVisible(true);
  }, []);

  const handleQuickImportClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    const normalized = normalizeRemoteUrl(text);
    if (!normalized.valid) {
      Alert.alert(
        '未检测到有效链接',
        '剪贴板中没有有效的 http/https 远控链接，你可以手动输入。',
        [
          { text: '取消', style: 'cancel' },
          { text: '手动添加', onPress: () => openAddModal() },
        ]
      );
      return;
    }
    openAddModal(normalized.url);
  }, [openAddModal]);

  if (!ready) {
    return (
      <SafeAreaView style={styles.splash}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.splashText}>正在加载远控设备...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style="light" />

      {activeDevice ? (
        <View style={styles.sessionContainer}>
          {!barCollapsed ? (
            <View style={styles.topBar}>
              <Pressable
                style={styles.deviceSelector}
                onPress={() => setSwitcherVisible(true)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: activeDevice.color },
                  ]}
                />
                <Text style={styles.activeTitle} numberOfLines={1}>
                  {activeDevice.name}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#94A3B8" />
              </Pressable>

              <View style={styles.topActions}>
                {devices.length > 1 && (
                  <>
                    <Pressable
                      style={styles.topIconBtn}
                      onPress={() => cycleDevice(-1)}
                      hitSlop={6}
                    >
                      <Ionicons name="chevron-back" size={18} color="#CBD5E1" />
                    </Pressable>
                    <Pressable
                      style={styles.topIconBtn}
                      onPress={() => cycleDevice(1)}
                      hitSlop={6}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#CBD5E1"
                      />
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={styles.topIconBtn}
                  onPress={() =>
                    webViewRefs.current[activeDevice.id]?.reload()
                  }
                  hitSlop={6}
                >
                  <Ionicons name="refresh" size={18} color="#CBD5E1" />
                </Pressable>

                <Pressable
                  style={styles.topIconBtn}
                  onPress={() => setActiveDeviceId(null)}
                  hitSlop={6}
                >
                  <Ionicons name="grid-outline" size={18} color="#CBD5E1" />
                </Pressable>

                <Pressable
                  style={styles.topIconBtn}
                  onPress={() => setBarCollapsed(true)}
                  hitSlop={6}
                >
                  <Ionicons name="expand-outline" size={18} color="#CBD5E1" />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.floatingPillWrap} pointerEvents="box-none">
              <Pressable
                style={styles.floatingPill}
                onPress={() => setSwitcherVisible(true)}
                onLongPress={() => setBarCollapsed(false)}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: activeDevice.color },
                  ]}
                />
                <Text style={styles.floatingPillText} numberOfLines={1}>
                  {activeDevice.name}
                </Text>
                <Pressable
                  onPress={() => setBarCollapsed(false)}
                  hitSlop={8}
                  style={styles.floatingExpandBtn}
                >
                  <Ionicons name="contract-outline" size={14} color="#CBD5E1" />
                </Pressable>
              </Pressable>
            </View>
          )}

          <View style={styles.webViewStage}>
            {devices
              .filter((d) => mountedIds.includes(d.id))
              .map((device) => (
                <RemoteWebViewPane
                  key={device.id}
                  ref={(instance) => {
                    webViewRefs.current[device.id] = instance;
                  }}
                  device={device}
                  isActive={device.id === activeDevice.id}
                  onEditDevice={openEditModal}
                  onOpenSwitcher={() => setSwitcherVisible(true)}
                />
              ))}
          </View>
        </View>
      ) : (
        <View style={styles.homeContainer}>
          <View style={styles.homeHeader}>
            <View>
              <Text style={styles.homeTitle}>Antigravity 远控</Text>
              <Text style={styles.homeSubtitle}>
                保存多台电脑远控链接，打开即连、一键切换
              </Text>
            </View>
            <Pressable
              style={styles.headerAddBtn}
              onPress={() => openAddModal()}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.quickActionRow}>
            <Pressable
              style={styles.quickCard}
              onPress={handleQuickImportClipboard}
            >
              <Ionicons name="clipboard-outline" size={18} color="#60A5FA" />
              <Text style={styles.quickCardText}>从剪贴板导入链接</Text>
            </Pressable>
            <Pressable
              style={styles.quickCard}
              onPress={() => openAddModal()}
            >
              <Ionicons name="add-circle-outline" size={18} color="#34D399" />
              <Text style={styles.quickCardText}>手动添加电脑</Text>
            </Pressable>
          </View>

          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={
              devices.length === 0 ? styles.emptyListContent : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="desktop-outline" size={38} color="#60A5FA" />
                </View>
                <Text style={styles.emptyTitle}>还没有保存远控链接</Text>
                <Text style={styles.emptyDesc}>
                  在电脑端 Antigravity 导出远程控制链接后，复制到手机并点击上方「从剪贴板导入链接」，即可一键保存并自动访问。
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMounted = mountedIds.includes(item.id);
              const isDefault = settings.defaultDeviceId === item.id;
              return (
                <Pressable
                  style={styles.homeCard}
                  onPress={() => connectToDevice(item)}
                >
                  <View style={styles.homeCardHeader}>
                    <View style={styles.homeCardTitleWrap}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.homeCardTitle} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {isMounted && (
                        <View style={styles.onlinePill}>
                          <Text style={styles.onlinePillText}>后台在线</Text>
                        </View>
                      )}
                      {isDefault && (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>默认</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.homeCardBtns}>
                      <Pressable
                        onPress={() => openEditModal(item)}
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name="create-outline"
                          size={18}
                          color="#94A3B8"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          Alert.alert(
                            '删除远控链接',
                            `确定要删除「${item.name}」吗？`,
                            [
                              { text: '取消', style: 'cancel' },
                              {
                                text: '删除',
                                style: 'destructive',
                                onPress: () => handleDeleteDevice(item.id),
                              },
                            ]
                          )
                        }
                        hitSlop={8}
                        style={styles.iconBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#F87171"
                        />
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.homeCardUrl} numberOfLines={1}>
                    {item.url}
                  </Text>

                  <View style={styles.homeCardFooter}>
                    <Text style={styles.homeCardMeta} numberOfLines={1}>
                      {formatRelativeTime(item.lastUsedAt)}
                      {item.note ? ` · ${item.note}` : ''}
                    </Text>
                    <View style={styles.connectTag}>
                      <Text style={styles.connectTagText}>点击连接</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={13}
                        color="#60A5FA"
                      />
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <DeviceSwitcherModal
        visible={switcherVisible}
        devices={devices}
        activeDeviceId={activeDeviceId}
        mountedIds={mountedIds}
        settings={settings}
        onClose={() => setSwitcherVisible(false)}
        onSelectDevice={connectToDevice}
        onCloseSession={handleCloseSession}
        onAddDevice={() => openAddModal()}
        onEditDevice={openEditModal}
        onDeleteDevice={handleDeleteDevice}
        onUpdateSettings={handleUpdateSettings}
      />

      <DeviceFormModal
        visible={formVisible}
        initialDevice={editingDevice}
        initialUrlFromClipboard={clipboardDraftUrl}
        onClose={() => {
          setFormVisible(false);
          setEditingDevice(null);
          setClipboardDraftUrl(undefined);
        }}
        onSave={handleSaveDevice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  splash: {
    flex: 1,
    backgroundColor: '#0B0F17',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  splashText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  sessionContainer: {
    flex: 1,
  },
  topBar: {
    height: 46,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '52%',
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  activeTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewStage: {
    flex: 1,
    position: 'relative',
  },
  floatingPillWrap: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 50,
  },
  floatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: 180,
  },
  floatingPillText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  floatingExpandBtn: {
    padding: 4,
    backgroundColor: 'rgba(51, 65, 85, 0.7)',
    borderRadius: 999,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  homeTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
  },
  homeSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  headerAddBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickCardText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  emptyBox: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  homeCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  homeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  homeCardTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  homeCardTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  onlinePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onlinePillText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '600',
  },
  defaultPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultPillText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '600',
  },
  homeCardBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  homeCardUrl: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 8,
  },
  homeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  homeCardMeta: {
    color: '#64748B',
    fontSize: 12,
    flex: 1,
    marginRight: 8,
  },
  connectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  connectTagText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
});
