import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { DEVICE_COLORS, NAME_PRESETS, RemoteDevice } from '../types';
import { createDeviceId, normalizeRemoteUrl } from '../storage';

interface DeviceFormModalProps {
  visible: boolean;
  initialDevice?: RemoteDevice | null;
  initialUrlFromClipboard?: string;
  onClose: () => void;
  onSave: (device: RemoteDevice, connectNow: boolean) => void;
}

export function DeviceFormModal({
  visible,
  initialDevice,
  initialUrlFromClipboard,
  onClose,
  onSave,
}: DeviceFormModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState<string>(DEVICE_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (initialDevice) {
      setName(initialDevice.name);
      setUrl(initialDevice.url);
      setNote(initialDevice.note ?? '');
      setColor(initialDevice.color);
    } else {
      setName('');
      setUrl(initialUrlFromClipboard ?? '');
      setNote('');
      setColor(DEVICE_COLORS[Math.floor(Math.random() * DEVICE_COLORS.length)]);
    }
    setError(null);
  }, [visible, initialDevice, initialUrlFromClipboard]);

  const handlePasteUrl = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setError('剪贴板为空，请先在电脑或微信/QQ复制远控链接');
      return;
    }
    const normalized = normalizeRemoteUrl(text);
    setUrl(normalized.valid ? normalized.url : text.trim());
    setError(normalized.valid ? null : normalized.error ?? null);
  };

  const handleSubmit = (connectNow: boolean) => {
    const cleanName = name.trim() || '我的电脑';
    const normalized = normalizeRemoteUrl(url);
    if (!normalized.valid) {
      setError(normalized.error ?? '请输入有效的远控链接');
      return;
    }

    const device: RemoteDevice = {
      id: initialDevice?.id ?? createDeviceId(),
      name: cleanName,
      url: normalized.url,
      color,
      note: note.trim() || undefined,
      createdAt: initialDevice?.createdAt ?? Date.now(),
      lastUsedAt: initialDevice?.lastUsedAt,
    };
    onSave(device, connectNow);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {initialDevice ? '编辑远控设备' : '添加远控链接'}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.label}>设备名称</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="例如：实验室台式机"
              placeholderTextColor="#64748B"
              maxLength={30}
            />

            {!initialDevice && (
              <View style={styles.presetsRow}>
                {NAME_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    style={[
                      styles.presetChip,
                      name === preset && styles.presetChipActive,
                    ]}
                    onPress={() => setName(preset)}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        name === preset && styles.presetTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={styles.labelRow}>
              <Text style={styles.label}>Antigravity 远控链接</Text>
              <Pressable style={styles.pasteBtn} onPress={handlePasteUrl}>
                <Ionicons name="clipboard-outline" size={14} color="#60A5FA" />
                <Text style={styles.pasteBtnText}>从剪贴板粘贴</Text>
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, styles.urlInput]}
              value={url}
              onChangeText={(val) => {
                setUrl(val);
                if (error) setError(null);
              }}
              placeholder="https://... 或粘贴完整分享文本"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              multiline
            />

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color="#F87171" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>标识颜色</Text>
            <View style={styles.colorRow}>
              {DEVICE_COLORS.map((c) => {
                const selected = color === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      selected && styles.colorCircleSelected,
                    ]}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>备注（可选）</Text>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="例如：RTX 4090 / 仅内网可用"
              placeholderTextColor="#64748B"
              maxLength={60}
            />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => handleSubmit(false)}
            >
              <Text style={styles.btnSecondaryText}>仅保存</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => handleSubmit(true)}
            >
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>保存并连接</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: '#1F2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pasteBtnText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  urlInput: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  presetChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  presetChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
  },
  presetText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  presetTextActive: {
    color: '#93C5FD',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    flex: 1,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnSecondary: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#2563EB',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
