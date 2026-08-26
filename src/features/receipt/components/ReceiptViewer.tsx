import { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/** Allow shrinking enough to fit a 680px receipt on narrow phones. */
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.25;
/** Horizontal inset so fitted content isn't flush against WebView edges. */
const FIT_PADDING_PX = 16;

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

function buildFitToScreenScript(fallbackWidth: number): string {
  return `
    (function() {
      function post(z) {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'fitZoom', zoom: z })
            );
          }
        } catch (e) {}
      }
      function applyFit() {
        var root = document.getElementById('invoice-root') || document.body;
        if (!root) return;
        var contentWidth = Math.max(
          root.scrollWidth || 0,
          root.offsetWidth || 0,
          1
        );
        var vw =
          window.innerWidth ||
          document.documentElement.clientWidth ||
          ${Math.max(1, Math.round(fallbackWidth))} ||
          0;
        if (!vw) return;
        var fit = Math.min(1, (vw - ${FIT_PADDING_PX}) / contentWidth);
        if (fit < ${MIN_ZOOM}) fit = ${MIN_ZOOM};
        if (fit > ${MAX_ZOOM}) fit = ${MAX_ZOOM};
        fit = Math.round(fit * 1000) / 1000;
        var html = document.documentElement;
        var body = document.body;
        if (html) html.style.zoom = String(fit);
        if (body) {
          body.style.zoom = String(fit);
          body.style.transform = '';
        }
        post(fit);
      }
      applyFit();
      setTimeout(applyFit, 80);
      setTimeout(applyFit, 320);
      true;
    })();
  `;
}

export function ReceiptViewer({ html }: ReceiptViewerProps) {
  const theme = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const webRef = useRef<WebView>(null);
  const [zoom, setZoom] = useState(1);
  const [viewerWidth, setViewerWidth] = useState(windowWidth);
  const fitZoomRef = useRef(1);

  const applyZoom = useCallback((next: number) => {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    const rounded = Math.round(clamped * 100) / 100;
    setZoom(rounded);
    webRef.current?.injectJavaScript(zoomScript(rounded));
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        zoom?: number;
      };
      if (data?.type !== 'fitZoom' || typeof data.zoom !== 'number') return;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.round(data.zoom * 1000) / 1000)
      );
      fitZoomRef.current = next;
      setZoom(next);
    } catch {
      // Ignore non-JSON messages from the page.
    }
  }, []);

  const zoomPercent = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  /**
   * Keep layout viewport = device width so window.innerWidth matches the
   * WebView. Receipt HTML is a fixed ~680px invoice; CSS zoom fits it.
   * user-scalable keeps pinch-zoom available alongside +/- controls.
   */
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
        'width=device-width, initial-scale=1, minimum-scale=0.25, maximum-scale=4, user-scalable=yes'
      );
      var style = document.createElement('style');
      style.textContent =
        'html,body{margin:0;padding:0;background:#FFF8E8;}' +
        '#invoice-root{margin-left:auto;margin-right:auto;}';
      document.head.appendChild(style);
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
          onLongPress={() => applyZoom(fitZoomRef.current)}
          accessibilityLabel="Zoom level. Long press to fit screen."
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

      <View
        style={styles.webviewHost}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth > 0) setViewerWidth(nextWidth);
        }}
      >
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={[styles.webview, { minHeight: windowHeight * 0.75 }]}
          // Fit is handled via CSS zoom; avoid Android auto-scale fighting 680px layout.
          scalesPageToFit={false}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          domStorageEnabled
          showsVerticalScrollIndicator
          showsHorizontalScrollIndicator
          injectedJavaScriptBeforeContentLoaded={injectedBefore}
          onMessage={handleMessage}
          onLoadEnd={() => {
            webRef.current?.injectJavaScript(
              buildFitToScreenScript(viewerWidth || windowWidth)
            );
          }}
          {...(Platform.OS === 'android'
            ? {
                setBuiltInZoomControls: true,
                setDisplayZoomControls: false,
                nestedScrollEnabled: true,
              }
            : {
                // iOS pinch-zoom via WKWebView + user-scalable viewport
                allowsInlineMediaPlayback: true,
              })}
        />
      </View>
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
  webviewHost: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
});
