import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { fetchRecentMarketingCustomers } from '../api/marketingCustomersApi';
import {
  generateMarketingDraft,
  MARKETING_TEMPLATE_OPTIONS,
} from '../services/marketingTemplates';
import {
  copyTextToClipboard,
  generatePosterPdf,
  sharePosterPdf,
  shareTextViaWhatsApp,
} from '../services/posterService';
import { MarketingTemplateId, MarketingCustomerPick } from '../types';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface MarketingPanelProps {
  /** Deep-link from hub home sample chips */
  initialTemplateId?: MarketingTemplateId;
}

/**
 * Template-based AI Marketing — EN + Marathi drafts, personalized from
 * vendor settings + recent bookings. Copy / WhatsApp / Poster PDF only.
 * Never auto-sends. No OpenAI.
 */
export function MarketingPanel({
  initialTemplateId = 'whatsapp_promo',
}: MarketingPanelProps) {
  const theme = useTheme();
  const businessName = useSettingsStore((s) => s.businessName);
  const phone = useSettingsStore((s) => s.phone);
  const address = useSettingsStore((s) => s.address);
  const mapLink = useSettingsStore((s) => s.mapLink);
  const stallDescription = useSettingsStore((s) => s.stallDescription);

  const profile = useMemo(
    () => ({ businessName, phone, address, mapLink, stallDescription }),
    [businessName, phone, address, mapLink, stallDescription]
  );

  const [templateId, setTemplateId] =
    useState<MarketingTemplateId>(initialTemplateId);
  const [customerIndex, setCustomerIndex] = useState(0);
  const [posterBusy, setPosterBusy] = useState(false);

  useEffect(() => {
    if (initialTemplateId) setTemplateId(initialTemplateId);
  }, [initialTemplateId]);

  const customersQuery = useQuery({
    queryKey: ['ai', 'marketing-customers'],
    queryFn: () => fetchRecentMarketingCustomers(12),
    staleTime: 60_000,
  });

  const needsCustomer = MARKETING_TEMPLATE_OPTIONS.find(
    (t) => t.id === templateId
  )?.needsCustomer;

  const customer =
    needsCustomer && customersQuery.data?.length
      ? customersQuery.data[
          Math.min(customerIndex, customersQuery.data.length - 1)
        ]
      : null;

  const draft = useMemo(
    () => generateMarketingDraft(templateId, profile, customer),
    [templateId, profile, customer]
  );

  useEffect(() => {
    setCustomerIndex(0);
  }, [templateId]);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(draft.text);
      Alert.alert('Copied', 'Draft copied. Paste it wherever you need.');
    } catch (err) {
      Alert.alert('Copy failed', getErrorMessage(err));
    }
  };

  const handleWhatsApp = async () => {
    try {
      await shareTextViaWhatsApp(draft.text, draft.customerMobile);
    } catch (err) {
      Alert.alert('WhatsApp', getErrorMessage(err));
    }
  };

  const handlePoster = async () => {
    if (!draft.poster) return;
    setPosterBusy(true);
    try {
      const uri = await generatePosterPdf(draft.poster, {
        businessName,
        phone,
        address,
      });
      await sharePosterPdf(uri);
    } catch (err) {
      Alert.alert('Poster', getErrorMessage(err));
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.kicker, { color: theme.colors.onSurfaceVariant }]}>
        Templates · no AI credits
      </Text>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        Draft marketing copy
      </Text>
      <Text style={[styles.lead, { color: theme.colors.onSurfaceVariant }]}>
        Personalized from your stall settings and recent bookings. Copy or open
        WhatsApp yourself — nothing is sent automatically.
      </Text>

      <View style={styles.templateList}>
        {MARKETING_TEMPLATE_OPTIONS.map((item) => {
          const selected = item.id === templateId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setTemplateId(item.id)}
              style={({ pressed }) => [
                styles.templateCard,
                elevation.level1,
                {
                  backgroundColor: selected
                    ? `${colors.deepSaffronDark}14`
                    : theme.colors.surface,
                  borderColor: selected
                    ? colors.deepSaffronDark
                    : theme.colors.outlineVariant,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.templateLabel,
                  {
                    color: selected
                      ? colors.deepSaffronDark
                      : theme.colors.onSurface,
                  },
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.templateSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {item.subtitle}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {needsCustomer ? (
        <View style={styles.customerBlock}>
          <Text
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            Recent customer
          </Text>
          {customersQuery.isLoading ? (
            <EmptyState compact message="Loading recent bookings…" />
          ) : customersQuery.isError ? (
            <EmptyState
              compact
              message={
                customersQuery.error instanceof Error
                  ? customersQuery.error.message
                  : 'Could not load customers.'
              }
            />
          ) : !customersQuery.data?.length ? (
            <EmptyState
              compact
              icon="account-off-outline"
              message="No bookings yet — add a booking to personalize thank-you / reminder drafts."
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.customerRow}
            >
              {customersQuery.data.map(
                (c: MarketingCustomerPick, index: number) => {
                const selected = index === customerIndex;
                return (
                  <Pressable
                    key={`${c.mobile}-${c.booking_date}-${index}`}
                    onPress={() => setCustomerIndex(index)}
                    style={[
                      styles.customerChip,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryContainer
                          : theme.colors.surfaceVariant,
                        borderColor: selected
                          ? theme.colors.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                        fontSize: 13,
                      }}
                      numberOfLines={1}
                    >
                      {c.customer_name || 'Customer'}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontSize: 11,
                      }}
                      numberOfLines={1}
                    >
                      {c.murti_name || 'Murti'} · {c.booking_date}
                    </Text>
                  </Pressable>
                );
              }
              )}
            </ScrollView>
          )}
        </View>
      ) : null}

      <AppCard elevationLevel={2} style={styles.previewCard}>
        <Text style={[styles.previewTitle, { color: theme.colors.primary }]}>
          {draft.title}
          {draft.language === 'mr' ? ' · मराठी' : ' · English'}
        </Text>
        <Text
          selectable
          style={[styles.previewText, { color: theme.colors.onSurface }]}
        >
          {draft.text}
        </Text>
      </AppCard>

      <View style={styles.actions}>
        <AppButton icon="content-copy" variant="outline" onPress={handleCopy}>
          Copy
        </AppButton>
        <AppButton icon="share-variant" variant="saffron" onPress={handleWhatsApp}>
          WhatsApp
        </AppButton>
        {draft.poster ? (
          <AppButton
            icon="file-pdf-box"
            loading={posterBusy}
            onPress={handlePoster}
          >
            Poster PDF
          </AppButton>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  templateList: {
    gap: spacing.sm,
  },
  templateCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.comfortable,
  },
  templateLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  templateSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  customerBlock: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  customerRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  customerChip: {
    maxWidth: 180,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  previewCard: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  previewText: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
