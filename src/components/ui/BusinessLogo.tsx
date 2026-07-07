import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { useBusinessDocumentSettings } from '@/features/settings/store/settingsStore';
import {
  BAPPAJI_LOGO_SVG,
  svgToDataUri,
} from '@/features/receipt/assets/receiptAssets';
import { colors } from '@/theme/colors';

const DEFAULT_LOGO_URI = svgToDataUri(BAPPAJI_LOGO_SVG);

interface BusinessLogoProps {
  size?: number;
  style?: ViewStyle;
}

export function BusinessLogo({ size = 48, style }: BusinessLogoProps) {
  const { businessLogo } = useBusinessDocumentSettings();
  const uri = businessLogo ?? DEFAULT_LOGO_URI;
  const inset = Math.max(4, Math.round(size * 0.12));

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
        source={{ uri }}
        style={{ width: size - inset * 2, height: size - inset * 2 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
