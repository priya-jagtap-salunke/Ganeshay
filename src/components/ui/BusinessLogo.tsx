import { useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import { colors } from '@/theme/colors';

function isRasterImageUri(uri: string): boolean {
  return (
    /^data:image\/(jpeg|jpg|png|webp|gif);/i.test(uri) ||
    uri.startsWith('file://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('content://')
  );
}

interface BusinessLogoProps {
  size?: number;
  style?: ViewStyle;
  /**
   * When true (default), show the Ganeshay BrandLogo if no vendor logo is set
   * or if the vendor logo fails to load — avoids an empty header/icon slot.
   */
  showBrandFallback?: boolean;
}

/** Vendor logo with optional Ganeshay brand fallback when missing/broken. */
export function BusinessLogo({
  size = 48,
  style,
  showBrandFallback = true,
}: BusinessLogoProps) {
  const { businessLogo } = useBusinessDocumentSettings();
  const [loadFailed, setLoadFailed] = useState(false);
  const inset = Math.max(4, Math.round(size * 0.12));
  const innerWidth = size - inset * 2;
  const hasVendorLogo =
    Boolean(businessLogo) && isRasterImageUri(businessLogo) && !loadFailed;

  if (!hasVendorLogo) {
    if (!showBrandFallback) return null;
    return (
      <BrandLogo
        variant="icon"
        size={size}
        framed
        style={style}
      />
    );
  }

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.18),
        },
        style,
      ]}
    >
      <Image
        source={{ uri: businessLogo! }}
        style={{ width: innerWidth, height: innerWidth }}
        resizeMode="contain"
        onError={() => setLoadFailed(true)}
        accessibilityLabel="Business logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
