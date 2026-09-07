import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  registerReceiptImageCaptureHandler,
  type ReceiptImageCaptureRequest,
} from '../utils/receiptImageCapture';

const CAPTURE_WIDTH = 680;
const CAPTURE_TIMEOUT_MS = 20000;

type ActiveCapture = ReceiptImageCaptureRequest & {
  htmlDoc: string;
};

function wrapCaptureHtml(bodyHtml: string, html2canvasJs: string): string {
  // Ensure we always have a full document; inject capture lib + auto-run.
  const hasHtmlTag = /<html[\s>]/i.test(bodyHtml);
  const inner = hasHtmlTag
    ? bodyHtml
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=${CAPTURE_WIDTH}"/></head><body style="margin:0;background:#FFF8E8;">${bodyHtml}</body></html>`;

  const captureBoot = `
<script>
${html2canvasJs}
</script>
<script>
(function () {
  function post(payload) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    } catch (e) {}
  }

  function run() {
    var target = document.getElementById('invoice-root') || document.body;
    if (!target || typeof html2canvas !== 'function') {
      post({ type: 'error', message: 'html2canvas unavailable' });
      return;
    }
    html2canvas(target, {
      backgroundColor: '#FFF8E8',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      width: Math.max(target.scrollWidth || 0, ${CAPTURE_WIDTH}),
      windowWidth: Math.max(target.scrollWidth || 0, ${CAPTURE_WIDTH}),
    }).then(function (canvas) {
      try {
        var dataUrl = canvas.toDataURL('image/png', 1.0);
        var comma = dataUrl.indexOf(',');
        var base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
        if (!base64) {
          post({ type: 'error', message: 'Empty PNG data' });
          return;
        }
        post({ type: 'png', base64: base64 });
      } catch (err) {
        post({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    }).catch(function (err) {
      post({ type: 'error', message: String(err && err.message ? err.message : err) });
    });
  }

  if (document.readyState === 'complete') {
    setTimeout(run, 120);
  } else {
    window.addEventListener('load', function () { setTimeout(run, 120); });
  }
})();
</script>`;

  if (/<\/body>/i.test(inner)) {
    return inner.replace(/<\/body>/i, `${captureBoot}</body>`);
  }
  return `${inner}${captureBoot}`;
}

/**
 * Off-screen WebView that turns receipt HTML into a PNG file for WhatsApp.
 * Mount once at app root (Android-focused; no-op registration on web).
 */
export function ReceiptImageCaptureHost() {
  const [html2canvasJs, setHtml2canvasJs] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveCapture | null>(null);
  const queueRef = useRef<ReceiptImageCaptureRequest[]>([]);
  const busyRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const html2canvasJsRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const pump = useCallback(() => {
    if (busyRef.current) return;
    const js = html2canvasJsRef.current;
    if (!js) return;
    const next = queueRef.current.shift();
    if (!next) return;

    busyRef.current = true;
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      busyRef.current = false;
      setActive(null);
      next.reject(new Error('Timed out rendering receipt image.'));
      pump();
    }, CAPTURE_TIMEOUT_MS);

    setActive({
      ...next,
      htmlDoc: wrapCaptureHtml(next.html, js),
    });
  }, [clearTimer]);

  const enqueue = useCallback(
    (request: ReceiptImageCaptureRequest) => {
      queueRef.current.push(request);
      pump();
    },
    [pump]
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../../../assets/vendor/html2canvas.min.js.txt')
        );
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) throw new Error('html2canvas asset missing');
        const js = await FileSystem.readAsStringAsync(uri);
        if (cancelled) return;
        html2canvasJsRef.current = js;
        setHtml2canvasJs(js);
      } catch (error) {
        console.warn('Failed to load html2canvas for receipt capture', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (html2canvasJs) {
      pump();
    }
  }, [html2canvasJs, pump]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      registerReceiptImageCaptureHandler(null);
      return;
    }
    registerReceiptImageCaptureHandler(enqueue);
    return () => {
      registerReceiptImageCaptureHandler(null);
      clearTimer();
    };
  }, [enqueue, clearTimer]);

  const finishOk = useCallback(
    async (base64: string) => {
      const current = active;
      if (!current) return;
      clearTimer();
      try {
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) {
          throw new Error('File cache is unavailable on this device.');
        }
        const downloadDir = `${cacheDir}Download/`;
        try {
          await FileSystem.makeDirectoryAsync(downloadDir, {
            intermediates: true,
          });
        } catch {
          // may already exist
        }
        const safe =
          current.filename.replace(/[^\w.-]+/g, '_').replace(/\.png$/i, '') ||
          'Receipt';
        const dest = `${downloadDir}${safe}_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(dest, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists || (typeof info.size === 'number' && info.size < 64)) {
          throw new Error('Receipt image file is empty.');
        }
        const uri = dest.startsWith('file://') ? dest : `file://${dest}`;
        busyRef.current = false;
        setActive(null);
        current.resolve(uri);
        pump();
      } catch (error) {
        busyRef.current = false;
        setActive(null);
        current.reject(
          error instanceof Error
            ? error
            : new Error('Could not save receipt image.')
        );
        pump();
      }
    },
    [active, clearTimer, pump]
  );

  const finishErr = useCallback(
    (message: string) => {
      const current = active;
      if (!current) return;
      clearTimer();
      busyRef.current = false;
      setActive(null);
      current.reject(new Error(message || 'Receipt image capture failed.'));
      pump();
    },
    [active, clearTimer, pump]
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          base64?: string;
          message?: string;
        };
        if (data.type === 'png' && data.base64) {
          void finishOk(data.base64);
          return;
        }
        if (data.type === 'error') {
          finishErr(data.message || 'Capture error');
        }
      } catch {
        // ignore non-JSON
      }
    },
    [finishOk, finishErr]
  );

  if (Platform.OS === 'web' || !active) {
    return null;
  }

  // Must be on-screen with non-zero size so Android WebView actually paints.
  return (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <WebView
        originWhitelist={['*']}
        source={{ html: active.htmlDoc }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        style={styles.webview}
        // Avoid Android blank captures for complex CSS
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CAPTURE_WIDTH,
    height: 1100,
    opacity: 0.02,
    zIndex: -1,
    overflow: 'hidden',
  },
  webview: {
    width: CAPTURE_WIDTH,
    height: 1100,
    backgroundColor: '#FFF8E8',
  },
});
