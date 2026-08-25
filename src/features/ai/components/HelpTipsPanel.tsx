import { ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/AppCard';
import { spacing, radius } from '@/theme/spacing';

const TIPS: Array<{ title: string; body: string }> = [
  {
    title: 'Where is this hub?',
    body: 'Only behind the floating AI button. Bookings, Reports, and Dashboard stay the same — no AI sprinkled elsewhere.',
  },
  {
    title: 'What is free?',
    body: 'Marketing templates (WhatsApp, Marathi, Instagram, festival greetings, poster PDF) and Sales Analyst cards from your booking data. No OpenAI key needed.',
  },
  {
    title: 'What is not included?',
    body: 'No ChatGPT-style free-form chat. Templates and booking analytics only. Stock/profit are estimates from bookings, not live inventory or purchase costs.',
  },
  {
    title: 'Marketing tips',
    body: 'Pick a template, review the draft, then Copy or open WhatsApp yourself. Nothing auto-sends. Personalized thank-you / reminder needs a recent booking.',
  },
  {
    title: 'Sales Analyst tips',
    body: 'Cards and the short insight text come from ai_get_sales_analysis on your stall’s bookings. Tap focus chips or hub samples to jump to a topic. Reports screens are separate.',
  },
  {
    title: 'Turn the hub off',
    body: 'Settings → AI Hub → disable “Enable AI Hub” to hide the floating button for this stall.',
  },
];

/** Lightweight FAQ / guided tips — no LLM. */
export function HelpTipsPanel() {
  const theme = useTheme();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={[styles.kicker, { color: theme.colors.onSurfaceVariant }]}>
        Help
      </Text>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Guided tips
      </Text>
      <Text style={[styles.lead, { color: theme.colors.onSurfaceVariant }]}>
        Simple answers for the free AI Hub. No chatbot — just clear guidance.
      </Text>

      {TIPS.map((tip) => (
        <AppCard key={tip.title} elevationLevel={1} style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
            {tip.title}
          </Text>
          <Text style={[styles.cardBody, { color: theme.colors.onSurface }]}>
            {tip.body}
          </Text>
        </AppCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
});
