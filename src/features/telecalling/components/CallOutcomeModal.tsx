import { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal, Portal, Text, RadioButton, useTheme } from 'react-native-paper';
import {
  TelecallingCallOutcome,
  TelecallingContact,
  TELECALLING_OUTCOMES,
} from '@/types/telecalling';
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
  const [outcome, setOutcome] = useState<TelecallingCallOutcome>('connected');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setOutcome('connected');
      setNotes('');
    }
  }, [visible, contact?.id]);

  if (!contact) return null;

  const notesRequired = outcome === 'other' || outcome === 'call_again';

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
            Call outcome
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
          >
            {contact.name} · {contact.mobile}
          </Text>
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
                setOutcome(value as TelecallingCallOutcome)
              }
              value={outcome}
            >
              {TELECALLING_OUTCOMES.map((item) => (
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
                  ? outcome === 'call_again'
                    ? 'When to call again / notes (optional)'
                    : 'Notes (required for Other)'
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
              Skip
            </AppButton>
            <AppButton
              onPress={() => onSave(outcome, notes)}
              loading={saving}
              disabled={outcome === 'other' && !notes.trim()}
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
