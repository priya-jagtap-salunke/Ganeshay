import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { brandLogoFull, brandLogoIcon } from '@/theme/brandAssets';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

type BrandLogoVariant = 'full' | 'icon';

interface BrandLogoProps {
  /** `full` = circular product logo; `icon` = same circular mark (compact) */
  variant?: BrandLogoVariant;
  /** Max width for the full poster (square source). */
  width?: number;
  /** Fixed square size when variant is `icon`. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** Soft frame behind the artwork */
  framed?: boolean;
}

/**
 * Official Ganeshay product logo. Do not use for vendor business logos.
 */
export function BrandLogo({
  variant = 'full',
  width = 220,
  size = 72,
  style,
  imageStyle,
  framed = false,
}: BrandLogoProps) {
  const source = variant === 'icon' ? brandLogoIcon : brandLogoFull;
  const dim = variant === 'icon' ? size : width;
  const pad = framed ? spacing.sm : 0;
  const imageDim = Math.max(24, dim - pad * 2);
  // Circular product mark — match the artwork silhouette
  const radius = Math.round(dim / 2);

  return (
    <View
      style={[
        styles.wrap,
        framed && styles.framed,
        {
          width: dim,
          height: dim,
          borderRadius: radius,
          padding: pad,
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={[{ width: imageDim, height: imageDim }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="Ganeshay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  framed: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
});
