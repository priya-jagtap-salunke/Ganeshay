import { Image, StyleSheet, View, ViewStyle } from 'react-native';
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
}

/** Vendor logo only — renders nothing when no logo is configured.
 *  Product (Ganeshay) branding uses `BrandLogo`, not this component. */
export function BusinessLogo({ size = 48, style }: BusinessLogoProps) {
  const { businessLogo } = useBusinessDocumentSettings();
  const inset = Math.max(4, Math.round(size * 0.12));
  const innerWidth = size - inset * 2;

  if (!businessLogo || !isRasterImageUri(businessLogo)) {
    return null;
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
        source={{ uri: businessLogo }}
        style={{ width: innerWidth, height: innerWidth }}
        resizeMode="contain"
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
