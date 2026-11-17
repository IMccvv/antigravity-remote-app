import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { RemoteDevice } from '../types';

export interface RemoteWebViewHandle {
  reload: () => void;
  goBack: () => boolean;
}

interface RemoteWebViewPaneProps {
  device: RemoteDevice;
  isActive: boolean;
  onEditDevice: (device: RemoteDevice) => void;
  onOpenSwitcher: () => void;
}

export const RemoteWebViewPane = forwardRef<
  RemoteWebViewHandle,
  RemoteWebViewPaneProps
>(({ device, isActive, onEditDevice, onOpenSwitcher }, ref) => {
  const webViewRef = useRef<any>(null);
  const TypedWebView = WebView as unknown as React.ComponentType<
    WebViewProps & { ref?: React.Ref<any> }
  >;
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [errorDesc, setErrorDesc] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      reload: () => {
        setErrorDesc(null);
        setLoading(true);
        webViewRef.current?.reload();
      },
      goBack: () => {
        if (canGoBack) {
          webViewRef.current?.goBack();
          return true;
        }
        return false;
      },
    }),
    [canGoBack]
  );

  return (
    <View
      style={[
        styles.container,
        isActive ? styles.activeContainer : styles.hiddenContainer,
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {loading && progress > 0 && progress < 1 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: device.color,
              },
            ]}
          />
        </View>
      )}

      <TypedWebView
        ref={webViewRef}
        source={{ uri: device.url }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        onLoadStart={() => {
          setErrorDesc(null);
          setLoading(true);
        }}
        onLoadProgress={({ nativeEvent }) => {
          setProgress(nativeEvent.progress);
        }}
        onLoadEnd={() => {
          setLoading(false);
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        onError={({ nativeEvent }) => {
          setLoading(false);
          setErrorDesc(nativeEvent.description || '无法连接到远控页面');
        }}
        onHttpError={({ nativeEvent }) => {
          if (nativeEvent.statusCode >= 500) {
            setErrorDesc(`远控服务返回错误 (${nativeEvent.statusCode})`);
          }
        }}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={device.color} />
            <Text style={styles.loadingTitle}>正在连接 {device.name}</Text>
            <Text style={styles.loadingUrl} numberOfLines={1}>
              {device.url}
            </Text>
          </View>
        )}
        startInLoadingState
      />

      {errorDesc && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={44} color="#F87171" />
            <Text style={styles.errorTitle}>连接失败</Text>
            <Text style={styles.errorDevice}>{device.name}</Text>
            <Text style={styles.errorMessage}>{errorDesc}</Text>
            <Text style={styles.errorHint}>
              请确认电脑端 Antigravity 正在运行，且远控链接未过期或处于同一网络。
            </Text>

            <View style={styles.errorActions}>
              <Pressable
                style={[styles.errBtn, styles.errBtnPrimary]}
                onPress={() => {
                  setErrorDesc(null);
                  setLoading(true);
                  webViewRef.current?.reload();
                }}
              >
                <Ionicons name="refresh" size={16} color="#FFFFFF" />
                <Text style={styles.errBtnPrimaryText}>重试连接</Text>
              </Pressable>

              <Pressable
                style={[styles.errBtn, styles.errBtnSecondary]}
                onPress={() => onEditDevice(device)}
              >
                <Ionicons name="create-outline" size={16} color="#E2E8F0" />
                <Text style={styles.errBtnSecondaryText}>修改链接</Text>
              </Pressable>
            </View>

            <Pressable style={styles.switchLinkBtn} onPress={onOpenSwitcher}>
              <Text style={styles.switchLinkText}>切换到其他电脑 →</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0B0F17',
  },
  activeContainer: {
    zIndex: 2,
    opacity: 1,
  },
  hiddenContainer: {
    zIndex: 0,
    opacity: 0,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: '#1E293B',
    zIndex: 10,
  },
  progressFill: {
    height: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0B0F17',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0B0F17',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 14,
  },
  loadingUrl: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 6,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#0B0F17',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  errorTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  errorDevice: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  errorMessage: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  errorHint: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    width: '100%',
  },
  errBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errBtnPrimary: {
    backgroundColor: '#2563EB',
  },
  errBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errBtnSecondary: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  errBtnSecondaryText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  switchLinkBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  switchLinkText: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },
});
