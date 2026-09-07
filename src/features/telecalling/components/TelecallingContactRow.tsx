import { StyleSheet, View, ViewStyle, Pressable, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import {
  TelecallingCallStatus,
  TelecallingContact,
  getContactOutcomeShortLabel,
  isNoAnswerBusyStatus,
  resolveTelecallingStatus,
} from '@/types/telecalling';
import { formatDisplayMobile } from '../utils/phoneNormalize';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/shadows';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface TelecallingContactRowProps {
  contact: TelecallingContact;
  index?: number;
  onCall: () => void;
  onSendDetails: () => void;
  onUpdateStatus: () => void;
  onGotThrough?: () => void;
  onCalledBack?: () => void;
  onDelete?: () => void;
  calling?: boolean;
  sending?: boolean;
  updating?: boolean;
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
    case 'callback':
      return { bg: colors.goldLight, fg: colors.royalRedDark };
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
  onUpdateStatus,
  onGotThrough,
  onCalledBack,
  onDelete,
  calling,
  sending,
  updating,
}: TelecallingContactRowProps) {
  const theme = useTheme();
  const status = resolveTelecallingStatus(
    contact.call_status,
    contact.last_outcome_notes
  );
  const lastCalled = formatLastCalled(contact.last_called_at);
  const statusLabel = getContactOutcomeShortLabel(
    status,
    contact.last_outcome_notes
  );
  const tone = outcomeTone(status);
  const note = noteSnippet(contact.last_outcome_notes);
  const showRetryActions =
    isNoAnswerBusyStatus(status) && (onGotThrough || onCalledBack);
  const displayMobile = formatDisplayMobile(contact.mobile);

  const metaParts: string[] = [];
  if (
    note &&
    status !== 'callback' &&
    !note.toLowerCase().includes('called back') &&
    !note.toLowerCase().includes('auto-detected')
  ) {
    metaParts.push(note);
  }
  if (lastCalled) metaParts.push(`Last try ${lastCalled}`);

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
            <Pressable
              onPress={onUpdateStatus}
              disabled={updating}
              accessibilityRole="button"
              accessibilityLabel={`Update status, currently ${statusLabel}`}
              style={({ pressed }) => [
                styles.outcomeChip,
                { backgroundColor: tone.bg },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text
                variant="labelSmall"
                style={[styles.outcomeText, { color: tone.fg }]}
                numberOfLines={1}
              >
                {statusLabel}
              </Text>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={12}
                color={tone.fg}
                style={{ marginLeft: 2 }}
              />
            </Pressable>
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

          {showRetryActions ? (
            <View style={styles.quickRow}>
              {onGotThrough ? (
                <Pressable
                  onPress={onGotThrough}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${contact.name} as got through`}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      borderColor: colors.success,
                      backgroundColor: colors.successContainer,
                    },
                    pressed && { opacity: 0.85 },
                    updating && { opacity: 0.55 },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={[styles.quickText, { color: colors.success }]}
                  >
                    Got through
                  </Text>
                </Pressable>
              ) : null}
              {onCalledBack ? (
                <Pressable
                  onPress={onCalledBack}
                  disabled={updating}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark ${contact.name} as called back`}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      borderColor: theme.colors.primary,
                      backgroundColor: theme.colors.primaryContainer,
                    },
                    pressed && { opacity: 0.85 },
                    updating && { opacity: 0.55 },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={[styles.quickText, { color: theme.colors.primary }]}
                  >
                    Called back
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={onUpdateStatus}
                disabled={updating}
                accessibilityRole="button"
                accessibilityLabel={`Update status for ${contact.name}`}
                style={({ pressed }) => [
                  styles.quickChip,
                  {
                    borderColor: theme.colors.outlineVariant,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  variant="labelSmall"
                  style={[
                    styles.quickText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Other…
                </Text>
              </Pressable>
            </View>
          ) : null}
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
            accessibilityLabel={`Call ${contact.name} at ${displayMobile}`}
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
          {!showRetryActions ? (
            <AppButton
              icon="clipboard-edit-outline"
              variant="text"
              onPress={onUpdateStatus}
              loading={updating}
              compact
              style={styles.actionBtn}
              contentStyle={styles.actionContent}
              labelStyle={styles.actionLabel}
              accessibilityLabel={`Update status for ${contact.name}`}
            >
              Status
            </AppButton>
          ) : null}
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  outcomeText: {
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  quickChip: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  quickText: {
    fontWeight: '700',
    fontSize: 11,
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
