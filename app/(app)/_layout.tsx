import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { touchTarget } from '@/theme/spacing';
// AI Hub temporarily disabled — re-enable by uncommenting below (and set AI_HUB_ENABLED = true)
// import { AiFloatingButton } from '@/features/ai/components/AiFloatingButton';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <View style={styles.root}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarActiveBackgroundColor: theme.colors.secondaryContainer,
          tabBarStyle: {
            backgroundColor: theme.colors.elevation?.level2 ?? theme.colors.surface,
            borderTopColor: theme.colors.outlineVariant,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: Platform.OS === 'android' ? 64 : 60,
            paddingBottom: Platform.OS === 'android' ? 8 : 4,
            paddingTop: 4,
            elevation: 3,
          },
          tabBarItemStyle: {
            minHeight: touchTarget.min,
            borderRadius: 16,
            marginHorizontal: 4,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            letterSpacing: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Home dashboard',
          }}
        />
        <Tabs.Screen
          name="overview"
          options={{
            title: 'Overview',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="view-dashboard-outline"
                size={size}
                color={color}
              />
            ),
            tabBarAccessibilityLabel: 'Overview',
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-box" size={size} color={color} />
            ),
            tabBarAccessibilityLabel: 'Reports',
          }}
        />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="booking" options={{ href: null }} />
        <Tabs.Screen name="telecalling" options={{ href: null }} />
        {/* Route kept registered but unreachable without FAB; screen itself is gated by AI_HUB_ENABLED */}
        <Tabs.Screen name="assistant" options={{ href: null }} />
      </Tabs>
      {/* AI Hub temporarily disabled — re-enable by uncommenting below (and set AI_HUB_ENABLED = true) */}
      {/* <AiFloatingButton /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
