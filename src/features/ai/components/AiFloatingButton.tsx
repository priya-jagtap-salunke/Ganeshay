import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVendorStore } from '@/stores/vendorStore';
import { touchTarget } from '@/theme/spacing';
import { elevation } from '@/theme/shadows';
import { AI_HUB_ENABLED } from '../constants';

/**
 * Single floating entry to the AI Hub.
 * Hidden on the assistant screen itself and when AI is disabled.
 * Do not add AI buttons elsewhere in the app.
 */
export function AiFloatingButton() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const aiEnabled = useVendorStore((s) => s.vendor?.ai_enabled !== false);
  const hasVendor = useVendorStore((s) => Boolean(s.vendor));

  const onAssistant =
    pathname?.includes('/assistant') || pathname === 'assistant';

  // AI Hub temporarily disabled — re-enable by setting AI_HUB_ENABLED = true
  // and uncommenting the FAB in app/(app)/_layout.tsx
  if (!AI_HUB_ENABLED || !hasVendor || !aiEnabled || onAssistant) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open AI Hub"
      onPress={() => router.push('/(app)/assistant')}
      style={({ pressed }) => [
        styles.fab,
        elevation.level3,
        {
          backgroundColor: theme.colors.primary,
          bottom: Math.max(insets.bottom, 8) + 64,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      <MaterialCommunityIcons
        name="robot-happy-outline"
        size={26}
        color={theme.colors.onPrimary}
      />
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color: theme.colors.onPrimary }]}>AI</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    zIndex: 50,
    minWidth: touchTarget.comfortable,
    minHeight: touchTarget.comfortable,
    borderRadius: 28,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  labelWrap: {
    marginLeft: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
