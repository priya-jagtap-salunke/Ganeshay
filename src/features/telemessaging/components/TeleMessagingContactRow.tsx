import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { TelecallingContact } from '@/types/telecalling';
import {
  TeleMessagingStatus,
  getMessageStatusShortLabel,
  normalizeTeleMessagingStatus,
} from '@/types/telemessaging';
import { formatDisplayMobile } from '@/features/telecalling/utils/phoneNormalize';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface TeleMessagingContactRowProps {
  contact: TelecallingContact;
  index?: number;
  onSendWhatsApp: () => void;
  onSendCatalogue?: () => void;
  showCatalogue?: boolean;
  sending?: boolean;
}

function formatLastMessaged(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusTone(status: TeleMessagingStatus): { bg: string; fg: string } {
  switch (status) {
    case 'sent':
      return { bg: colors.successContainer, fg: colors.success };
    case 'pending':
    default:
      return { bg: colors.pendingContainer, fg: colors.pending };
  }
}

export function TeleMessagingContactRow({
  contact,
  index = 0,
  onSendWhatsApp,
  onSendCatalogue,
  showCatalogue,
  sending,
}: TeleMessagingContactRowProps) {
  const theme = useTheme();
  const status = normalizeTeleMessagingStatus(contact.message_status);
  const lastMessaged = formatLastMessaged(contact.last_messaged_at);
  const statusLabel = getMessageStatusShortLabel(
    status,
    contact.last_message_kind
  );
  const tone = statusTone(status);
  const displayMobile = formatDisplayMobile(contact.mobile);

  return (
    <Animated.View entering={FadeInRight.delay(index * 30).springify()}>
      <View
        style={[
          styles.row,
          elevation.level1 as ViewStyle,
          {
            backgroundColor:
              theme.colors.elevation?.level1 ?? theme.colors.surface,
            borderRadius: radius.md,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <View style={styles.info}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            numberOfLines={1}
          >
            {contact.name}
          </Text>
          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.primary,
              marginTop: 2,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
            accessibilityLabel={`Phone ${displayMobile}`}
          >
            {displayMobile}
          </Text>

          <View style={styles.feedbackRow}>
            <View style={[styles.outcomeChip, { backgroundColor: tone.bg }]}>
              <Text
                variant="labelSmall"
                style={[styles.outcomeText, { color: tone.fg }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
            </View>
            {lastMessaged ? (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  flex: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}
              >
                Last {lastMessaged}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            icon="whatsapp"
            variant="saffron"
            onPress={onSendWhatsApp}
            loading={sending}
            compact
            style={styles.actionBtn}
            contentStyle={styles.actionContent}
            labelStyle={styles.actionLabel}
            accessibilityLabel={`Send WhatsApp to ${contact.name}`}
          >
            Send
          </AppButton>
          {showCatalogue && onSendCatalogue ? (
            <AppButton
              icon="file-pdf-box"
              variant="tonal"
              onPress={onSendCatalogue}
              loading={sending}
              compact
              style={styles.actionBtn}
              contentStyle={styles.actionContent}
              labelStyle={styles.actionLabel}
              accessibilityLabel={`Send catalogue to ${contact.name}`}
            >
              Catalogue
            </AppButton>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  outcomeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    maxWidth: '55%',
  },
  outcomeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  actions: {
    alignItems: 'stretch',
    minWidth: 118,
  },
  actionBtn: {
    minHeight: touchTarget.min - 8,
  },
  actionContent: {
    height: 36,
  },
  actionLabel: {
    fontSize: 11,
    marginVertical: 0,
    marginHorizontal: 0,
  },
});
