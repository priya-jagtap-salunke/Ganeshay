import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AiHubNavigatePayload,
  MarketingTemplateId,
  SalesFocusId,
} from '../types';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';
import { colors } from '@/theme/colors';

const LIMITATIONS = [
  'No free-form ChatGPT chat — this is not a chatbot.',
  'Marketing uses ready templates (you can edit before you send).',
  'Sales insights come from your bookings & payments — not live market data.',
  'Stock / profit are estimates from bookings (no purchase-cost inventory).',
  'Never auto-sends WhatsApp — you always review first.',
];

const MARKETING_SAMPLES: Array<{
  label: string;
  template: MarketingTemplateId;
}> = [
  {
    label: 'WhatsApp offer for a customer',
    template: 'personalized_thanks',
  },
  {
    label: 'Marathi stall message',
    template: 'marathi_invite',
  },
  {
    label: 'Instagram caption for Ganpati season',
    template: 'instagram_caption',
  },
  {
    label: 'Festival greeting (Ganpati Bappa Morya)',
    template: 'festival_greeting',
  },
  {
    label: 'Create a simple poster PDF',
    template: 'promo_poster',
  },
];

const SALES_SAMPLES: Array<{ label: string; focus: SalesFocusId }> = [
  { label: 'What is my top-selling murti?', focus: 'top_idol' },
  { label: 'How is revenue this year vs pending?', focus: 'payments' },
  { label: 'Who are my repeat customers?', focus: 'repeat' },
  { label: 'Which sizes are slow-moving?', focus: 'slow' },
  {
    label: 'Show payment / advance collection snapshot',
    focus: 'payments',
  },
];

type ModeCard = {
  mode: 'marketing' | 'sales' | 'help';
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent: string;
};

const MODE_CARDS: ModeCard[] = [
  {
    mode: 'marketing',
    title: 'Marketing',
    subtitle:
      'WhatsApp, Marathi, Instagram, festival greetings, and poster PDFs — you send manually.',
    icon: 'bullhorn-outline',
    accent: colors.deepSaffronDark,
  },
  {
    mode: 'sales',
    title: 'Sales Analyst',
    subtitle:
      'Top murti, revenue, pending, repeat customers, and slow movers from your bookings.',
    icon: 'chart-timeline-variant',
    accent: colors.goldDark,
  },
  {
    mode: 'help',
    title: 'Help & tips',
    subtitle: 'Short guide to what is free and how to use this hub.',
    icon: 'help-circle-outline',
    accent: colors.royalRed,
  },
];

interface AiHubHomeProps {
  onNavigate: (payload: AiHubNavigatePayload) => void;
}

function SampleChip({
  label,
  accent,
  onPress,
}: {
  label: string;
  accent: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: `${accent}14`,
          borderColor: `${accent}55`,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: theme.colors.onSurface }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Guided free hub home — capabilities, honest limits, and tappable samples.
 * Deep-links into Marketing / Sales Analyst (no blank chat).
 */
export function AiHubHome({ onNavigate }: AiHubHomeProps) {
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="handled"
    >
      <Animated.View entering={FadeInDown.springify()}>
        <View
          style={[
            styles.introCard,
            elevation.level2,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <Text style={[styles.kicker, { color: theme.colors.onSurfaceVariant }]}>
            Free · no OpenAI key
          </Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            AI Hub (Free)
          </Text>
          <Text style={[styles.lead, { color: theme.colors.onSurfaceVariant }]}>
            Works from your stall booking data — no paid AI required. Use Marketing
            templates and Sales Analyst cards. Everything stays in this hub (not
            on Bookings or Reports).
          </Text>

          <Text
            style={[styles.limitsHeading, { color: theme.colors.onSurface }]}
          >
            What this hub does not do
          </Text>
          {LIMITATIONS.map((line) => (
            <View key={line} style={styles.limitRow}>
              <Text style={{ color: colors.deepSaffronDark, marginTop: 2 }}>
                •
              </Text>
              <Text
                style={[styles.limitText, { color: theme.colors.onSurfaceVariant }]}
              >
                {line}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {MODE_CARDS.map((item, index) => (
        <Animated.View
          key={item.mode}
          entering={FadeInDown.delay(60 + index * 50).springify()}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => onNavigate({ mode: item.mode })}
            style={({ pressed }) => [
              styles.card,
              elevation.level2,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${item.accent}1A` },
              ]}
            >
              <MaterialCommunityIcons
                name={item.icon}
                size={28}
                color={item.accent}
              />
            </View>
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                {item.title}
              </Text>
              <Text
                style={[
                  styles.cardSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {item.subtitle}
              </Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>
        </Animated.View>
      ))}

      <Animated.View entering={FadeInDown.delay(220).springify()}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Try Marketing
        </Text>
        <Text style={[styles.sectionHint, { color: theme.colors.onSurfaceVariant }]}>
          Tap a sample — opens a ready template you can copy or share.
        </Text>
        <View style={styles.chipWrap}>
          {MARKETING_SAMPLES.map((sample) => (
            <SampleChip
              key={sample.template + sample.label}
              label={sample.label}
              accent={colors.deepSaffronDark}
              onPress={() =>
                onNavigate({
                  mode: 'marketing',
                  marketingTemplate: sample.template,
                })
              }
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(280).springify()}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
          Try Sales Analyst
        </Text>
        <Text style={[styles.sectionHint, { color: theme.colors.onSurfaceVariant }]}>
          Tap a question — opens your booking insights (no chatbot).
        </Text>
        <View style={styles.chipWrap}>
          {SALES_SAMPLES.map((sample) => (
            <SampleChip
              key={sample.focus + sample.label}
              label={sample.label}
              accent={colors.goldDark}
              onPress={() =>
                onNavigate({
                  mode: 'sales',
                  salesFocus: sample.focus,
                })
              }
            />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  introCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  limitsHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  limitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 6,
  },
  limitText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
    minHeight: touchTarget.comfortable + 24,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
