import { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;

interface ReceiptViewerProps {
  html: string;
}

function zoomScript(zoom: number): string {
  return `
    (function() {
      var z = ${zoom};
      var root = document.documentElement;
      var body = document.body;
      if (root) root.style.zoom = String(z);
      if (body) {
        body.style.zoom = String(z);
        body.style.transform = '';
      }
      true;
    })();
  `;
}

export function ReceiptViewer({ html }: ReceiptViewerProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const webRef = useRef<WebView>(null);
  const [zoom, setZoom] = useState(1);

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const rounded = Math.round(clamped * 100) / 100;
    setZoom(rounded);
    webRef.current?.injectJavaScript(zoomScript(rounded));
  }, []);

  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  const injectedBefore = `
    (function() {
      var meta = document.querySelector('meta[name=viewport]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        document.head.appendChild(meta);
      }
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes'
      );
      true;
    })();
  `;

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.zoomBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: colors.grayLight,
          },
        ]}
      >
        <IconButton
          icon="minus"
          mode="contained-tonal"
          size={20}
          onPress={() => applyZoom(zoom - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          accessibilityLabel="Zoom out"
        />
        <Text
          variant="labelLarge"
          style={{
            color: theme.colors.onSurface,
            minWidth: 52,
            textAlign: 'center',
          }}
        >
          {zoomPercent}
        </Text>
        <IconButton
          icon="plus"
          mode="contained-tonal"
          size={20}
          onPress={() => applyZoom(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          accessibilityLabel="Zoom in"
        />
      </View>

      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={[styles.webview, { minHeight: windowHeight * 0.75 }]}
        scalesPageToFit={Platform.OS === 'android'}
        setSupportMultipleWindows={false}
        javaScriptEnabled
        domStorageEnabled
        showsVerticalScrollIndicator
        showsHorizontalScrollIndicator
        injectedJavaScriptBeforeContentLoaded={injectedBefore}
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(zoomScript(zoom));
        }}
        {...(Platform.OS === 'android'
          ? {
              setBuiltInZoomControls: true,
              setDisplayZoomControls: false,
              nestedScrollEnabled: true,
            }
          : {
              // iOS pinch-zoom via scroll view behavior in WKWebView
              allowsInlineMediaPlayback: true,
            })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
});
