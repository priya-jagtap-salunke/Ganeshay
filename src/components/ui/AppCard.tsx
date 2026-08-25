import { StyleSheet, ViewStyle } from 'react-native';
import { Card, CardProps, useTheme } from 'react-native-paper';
import { radius } from '@/theme/spacing';

interface AppCardProps extends Omit<CardProps, 'elevation'> {
  elevationLevel?: 0 | 1 | 2 | 3 | 4 | 5;
}

export function AppCard({
  style,
  elevationLevel = 1,
  mode = 'elevated',
  ...props
}: AppCardProps) {
  const theme = useTheme();

  return (
    <Card
      mode={mode}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.elevation?.level1 ?? theme.colors.surface,
          borderRadius: radius.lg,
          elevation: elevationLevel,
        } as ViewStyle,
        style as ViewStyle,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
