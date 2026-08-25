import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, IconButton, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import {
  CallLogEntry,
  fetchRecentCallLogs,
  isCallLogSupported,
  openAppSettings,
  showCallLogUnavailableAlert,
} from '../services/callLogService';
import { CreateTelecallingContactInput } from '@/types/telecalling';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

interface CallLogPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (contacts: CreateTelecallingContactInput[]) => void;
  isSaving?: boolean;
}

function formatCallTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function callTypeLabel(type: string): string {
  const normalized = type.toUpperCase();
  if (normalized.includes('INCOMING')) return 'Incoming';
  if (normalized.includes('OUTGOING')) return 'Outgoing';
  if (normalized.includes('MISSED')) return 'Missed';
  return 'Call';
}

function entryKey(entry: CallLogEntry): string {
  return `${entry.phoneNumber}-${entry.timestamp}`;
}

function entryToImportInput(
  entry: CallLogEntry
): CreateTelecallingContactInput {
  const callNote = entry.timestamp
    ? `From call log (${callTypeLabel(entry.type)} ${formatCallTime(entry.timestamp)})`
    : 'From call log';

  return {
    name:
      entry.name === 'Unknown' || !entry.name.trim()
        ? `Contact ${entry.phoneNumber}`
        : entry.name.trim(),
    mobile: entry.phoneNumber,
    notes: callNote,
  };
}

export function CallLogPickerModal({
  visible,
  onDismiss,
  onConfirm,
  isSaving,
}: CallLogPickerModalProps) {
  const [loading, setLoading] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [manualMode, setManualMode] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualMobile, setManualMobile] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadCallLogs = useCallback(async () => {
    if (!isCallLogSupported()) {
      setManualMode(true);
      setCallLogs([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const logs = await fetchRecentCallLogs(50);
      setCallLogs(logs);
      if (logs.length === 0) {
        setError('No recent calls found. Add the number manually.');
        setManualMode(true);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setManualMode(true);
      setCallLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setManualMode(false);
    setManualName('');
    setManualMobile('');
    setSelectedKeys(new Set());
    setError(null);
    loadCallLogs();
  }, [visible, loadCallLogs]);

  const selectedCount = selectedKeys.size;

  const selectedEntries = useMemo(
    () => callLogs.filter((entry) => selectedKeys.has(entryKey(entry))),
    [callLogs, selectedKeys]
  );

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImportSelected = () => {
    if (!selectedEntries.length) {
      Alert.alert(
        'No calls selected',
        'Select at least one recent call to add to tele-calling.'
      );
      return;
    }
    onConfirm(selectedEntries.map(entryToImportInput));
  };

  const handleManualAdd = () => {
    const mobile = manualMobile.replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number.');
      return;
    }

    onConfirm([
      {
        name: manualName.trim() || `Contact ${mobile}`,
        mobile,
        notes: 'Added manually',
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>From call log</Text>
          <IconButton icon="close" onPress={onDismiss} iconColor={colors.white} />
        </View>

        <View style={styles.body}>
          {!manualMode ? (
            <>
              <Text style={styles.subtitle}>
                Select recent callers to add to tele-calling
              </Text>

              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.royalRed} />
                  <Text style={styles.loadingText}>Loading call logs...</Text>
                </View>
              ) : (
                <FlatList
                  data={callLogs}
                  keyExtractor={entryKey}
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => {
                    const key = entryKey(item);
                    const checked = selectedKeys.has(key);
                    return (
                      <Pressable
                        onPress={() => toggleKey(key)}
                        disabled={isSaving}
                        style={({ pressed }) => [
                          styles.callRow,
                          checked && styles.callRowSelected,
                          pressed && styles.callRowPressed,
                        ]}
                      >
                        <Checkbox
                          status={checked ? 'checked' : 'unchecked'}
                          onPress={() => toggleKey(key)}
                          color={colors.royalRed}
                        />
                        <View style={styles.callIcon}>
                          <MaterialCommunityIcons
                            name="phone-log"
                            size={22}
                            color={colors.royalRed}
                          />
                        </View>
                        <View style={styles.callInfo}>
                          <Text style={styles.callName}>{item.name}</Text>
                          <Text style={styles.callNumber}>{item.phoneNumber}</Text>
                          <Text style={styles.callMeta}>
                            {callTypeLabel(item.type)} •{' '}
                            {formatCallTime(item.timestamp)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }}
                  ListEmptyComponent={
                    error ? <Text style={styles.errorText}>{error}</Text> : null
                  }
                />
              )}

              <AppButton
                onPress={handleImportSelected}
                loading={isSaving}
                disabled={!selectedCount || isSaving}
              >
                {selectedCount > 0
                  ? `Import ${selectedCount}`
                  : 'Import selected'}
              </AppButton>

              <AppButton
                variant="outline"
                icon="keyboard-outline"
                onPress={() => setManualMode(true)}
              >
                Enter Number Manually
              </AppButton>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                {isCallLogSupported()
                  ? 'Enter contact details manually'
                  : 'Call logs are Android-only. Enter the number manually.'}
              </Text>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <AppInput
                label="Customer Name (optional)"
                value={manualName}
                onChangeText={setManualName}
              />
              <AppInput
                label="Mobile Number *"
                value={manualMobile}
                onChangeText={setManualMobile}
                keyboardType="phone-pad"
              />

              <AppButton onPress={handleManualAdd} loading={isSaving}>
                Add to Tele-calling
              </AppButton>

              {isCallLogSupported() ? (
                <>
                  <AppButton
                    variant="outline"
                    icon="phone-log"
                    onPress={() => {
                      setManualMode(false);
                      loadCallLogs();
                    }}
                  >
                    Back to Call Logs
                  </AppButton>
                  <AppButton
                    variant="outline"
                    icon="cog-outline"
                    onPress={() => {
                      openAppSettings().catch(() => undefined);
                    }}
                  >
                    Open App Settings
                  </AppButton>
                </>
              ) : (
                <AppButton
                  variant="outline"
                  onPress={showCallLogUnavailableAlert}
                >
                  Why no call logs?
                </AppButton>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.warmIvory,
  },
  header: {
    backgroundColor: colors.royalRed,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  list: {
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  callRowSelected: {
    borderColor: colors.royalRed,
    backgroundColor: colors.warmIvory,
  },
  callRowPressed: {
    opacity: 0.9,
  },
  callIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.warmIvory,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  callInfo: {
    flex: 1,
  },
  callName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  callNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.royalRed,
    marginTop: 2,
  },
  callMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
});
