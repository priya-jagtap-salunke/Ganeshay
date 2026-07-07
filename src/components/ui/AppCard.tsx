import { StyleSheet, ViewStyle } from 'react-native';
import { Card, CardProps } from 'react-native-paper';
import { colors } from '@/theme/colors';

export function AppCard({ style, ...props }: CardProps) {
  return <Card style={[styles.card, style as ViewStyle]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 2,
  },
});
