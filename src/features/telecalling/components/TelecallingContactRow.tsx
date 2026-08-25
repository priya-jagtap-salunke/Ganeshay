import { StyleSheet, View, ViewStyle, Pressable, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import {
  TelecallingCallStatus,
  TelecallingContact,
  getOutcomeShortLabel,
  normalizeTelecallingStatus,
} from '@/types/telecalling';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface TelecallingContactRowProps {
  contact: TelecallingContact;
  index?: number;
  onCall: () => void;
  onSendDetails: () => void;
  onDelete?: () => void;
  calling?: boolean;
  sending?: boolean;
}

function formatLastCalled(value: string | null): string | null {
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

function outcomeTone(status: TelecallingCallStatus): {
  bg: string;
  fg: string;
} {
  switch (status) {
    case 'connected':
      return { bg: colors.successContainer, fg: colors.success };
    case 'declined':
    case 'wrong_number':
      return { bg: colors.errorContainer, fg: colors.error };
    case 'call_again':
    case 'pending':
      return { bg: colors.pendingContainer, fg: colors.pending };
    case 'no_answer':
    case 'busy':
    case 'disconnected':
      return { bg: '#E3E8EF', fg: '#3D4A5C' };
    case 'other':
    default:
      return { bg: colors.grayLight, fg: colors.textSecondary };
  }
}

function noteSnippet(notes: string | null): string | null {
  if (!notes) return null;
  const trimmed = notes.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.length > 36 ? `${trimmed.slice(0, 36)}…` : trimmed;
}

export function TelecallingContactRow({
  contact,
  index = 0,
  onCall,
  onSendDetails,
  onDelete,
  calling,
  sending,
}: TelecallingContactRowProps) {
  const theme = useTheme();
  const status = normalizeTelecallingStatus(contact.call_status);
  const lastCalled = formatLastCalled(contact.last_called_at);
  const statusLabel = getOutcomeShortLabel(status);
  const tone = outcomeTone(status);
  const note = noteSnippet(contact.last_outcome_notes);

  const metaParts: string[] = [];
  if (note) metaParts.push(note);
  if (lastCalled) metaParts.push(lastCalled);

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
            variant="titleSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '600' }}
            numberOfLines={1}
          >
            {contact.name}
          </Text>
          <Text
            variant="bodyMedium"
            style={{
              color: theme.colors.primary,
              marginTop: 2,
              fontWeight: '600',
            }}
          >
            {contact.mobile}
          </Text>

          <View style={styles.feedbackRow}>
            <View
              style={[styles.outcomeChip, { backgroundColor: tone.bg }]}
              accessibilityLabel={`Last outcome: ${statusLabel}`}
            >
              <Text
                variant="labelSmall"
                style={[styles.outcomeText, { color: tone.fg }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
            </View>
            {metaParts.length > 0 ? (
              <Text
                variant="bodySmall"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  flex: 1,
                  minWidth: 0,
                }}
                numberOfLines={1}
              >
                {metaParts.join(' · ')}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            icon="phone"
            variant="saffron"
            onPress={onCall}
            loading={calling}
            compact
            style={styles.actionBtn}
            contentStyle={styles.actionContent}
            labelStyle={styles.actionLabel}
            accessibilityLabel={`Call ${contact.name}`}
          >
            Call
          </AppButton>
          <AppButton
            icon="whatsapp"
            variant="tonal"
            onPress={onSendDetails}
            loading={sending}
            compact
            style={styles.actionBtn}
            contentStyle={styles.actionContent}
            labelStyle={styles.actionLabel}
            accessibilityLabel={`Send stall details to ${contact.name}`}
          >
            Send
          </AppButton>
        </View>

        {onDelete ? (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${contact.name}`}
            android_ripple={{ color: theme.colors.error + '22' }}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                borderColor: theme.colors.error,
                backgroundColor: theme.colors.errorContainer,
              },
              pressed && Platform.OS !== 'android' && { opacity: 0.85 },
            ]}
          >
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color={theme.colors.error}
            />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
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
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  outcomeChip: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '55%',
  },
  outcomeText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  actions: {
    gap: 4,
    alignItems: 'stretch',
  },
  actionBtn: {
    marginVertical: 0,
    minWidth: 88,
  },
  actionContent: {
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 0,
  },
  deleteBtn: {
    width: touchTarget.min - 8,
    height: touchTarget.min - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    overflow: 'hidden',
    alignSelf: 'center',
  },
});
