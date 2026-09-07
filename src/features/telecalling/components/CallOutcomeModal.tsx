import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal, Portal, Text, RadioButton, useTheme } from 'react-native-paper';
import {
  CALLED_BACK_NOTE,
  TelecallingCallOutcome,
  TelecallingContact,
  TELECALLING_OUTCOMES,
  getOutcomeShortLabel,
  isNoAnswerBusyStatus,
  resolveTelecallingStatus,
} from '@/types/telecalling';
import { formatDisplayMobile } from '../utils/phoneNormalize';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { radius, spacing } from '@/theme/spacing';

interface CallOutcomeModalProps {
  visible: boolean;
  contact: TelecallingContact | null;
  saving?: boolean;
  onDismiss: () => void;
  onSave: (outcome: TelecallingCallOutcome, notes: string) => void;
}

export function CallOutcomeModal({
  visible,
  contact,
  saving,
  onDismiss,
  onSave,
}: CallOutcomeModalProps) {
  const theme = useTheme();
  const [choice, setChoice] = useState<TelecallingCallOutcome>('connected');
  const [notes, setNotes] = useState('');

  const previousStatus = contact
    ? resolveTelecallingStatus(
        contact.call_status,
        contact.last_outcome_notes
      )
    : 'pending';
  const fromNoAnswer = isNoAnswerBusyStatus(previousStatus);

  const options = useMemo(() => {
    const base = TELECALLING_OUTCOMES.map((item) => ({
      value: item.value,
      label: item.label,
    }));
    if (!fromNoAnswer) return base;

    // Put reconnect outcomes first when updating someone stuck in No answer.
    const preferred: { value: TelecallingCallOutcome; label: string }[] = [
      { value: 'connected', label: 'Got through / connected' },
      { value: 'callback', label: 'Customer called back' },
      { value: 'no_answer', label: 'Still no answer' },
      { value: 'busy', label: 'Busy' },
    ];
    const preferredValues = new Set(preferred.map((p) => p.value));
    return [
      ...preferred,
      ...base.filter((item) => !preferredValues.has(item.value)),
    ];
  }, [fromNoAnswer]);

  useEffect(() => {
    if (visible) {
      setChoice('connected');
      setNotes('');
    }
  }, [visible, contact?.id]);

  if (!contact) return null;

  const notesRequired = choice === 'other' || choice === 'call_again';
  const displayMobile = formatDisplayMobile(contact.mobile);
  const previousLabel = getOutcomeShortLabel(previousStatus);

  const handleSave = () => {
    if (choice === 'callback') {
      onSave('callback', notes.trim() || CALLED_BACK_NOTE);
      return;
    }
    onSave(choice, notes);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={saving ? undefined : onDismiss}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {fromNoAnswer ? 'Update call result' : 'Call outcome'}
          </Text>
          <Text
            variant="titleSmall"
            style={{
              color: theme.colors.onSurface,
              marginTop: spacing.sm,
              fontWeight: '700',
            }}
          >
            {contact.name}
          </Text>
          <Text
            variant="bodyLarge"
            style={{
              color: theme.colors.primary,
              fontWeight: '700',
              letterSpacing: 0.3,
              marginTop: 2,
            }}
          >
            {displayMobile}
          </Text>
          {previousStatus !== 'pending' ? (
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                marginTop: spacing.xs,
              }}
            >
              Currently: {previousLabel}
              {fromNoAnswer
                ? ' — pick a new result so they leave No answer'
                : ''}
            </Text>
          ) : null}
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginTop: spacing.sm,
              marginBottom: spacing.xs,
            }}
          >
            How did the call end?
          </Text>

          <ScrollView style={styles.options} keyboardShouldPersistTaps="handled">
            <RadioButton.Group
              onValueChange={(value) =>
                setChoice(value as TelecallingCallOutcome)
              }
              value={choice}
            >
              {options.map((item) => (
                <RadioButton.Item
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  position="leading"
                  style={styles.radioItem}
                  labelStyle={{ fontSize: 14 }}
                />
              ))}
            </RadioButton.Group>

            <AppInput
              label={
                notesRequired
                  ? choice === 'call_again'
                    ? 'When to call again / notes (optional)'
                    : 'Notes (required for Other)'
                  : choice === 'callback'
                    ? 'Notes (optional — defaults to “Customer called back”)'
                    : 'Notes (optional)'
              }
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={styles.notes}
            />
          </ScrollView>

          <View style={styles.actions}>
            <AppButton
              variant="outline"
              onPress={onDismiss}
              disabled={saving}
              style={styles.actionBtn}
            >
              {fromNoAnswer ? 'Keep as is' : 'Skip'}
            </AppButton>
            <AppButton
              onPress={handleSave}
              loading={saving}
              disabled={choice === 'other' && !notes.trim()}
              style={styles.actionBtn}
            >
              Save
            </AppButton>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    maxHeight: '85%',
  },
  options: {
    maxHeight: 360,
  },
  radioItem: {
    paddingVertical: 0,
  },
  notes: {
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionBtn: {
    flex: 1,
    marginVertical: 0,
  },
});
