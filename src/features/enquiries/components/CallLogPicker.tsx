import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import {
  CallLogEntry,
  fetchRecentCallLogs,
  isCallLogSupported,
  showCallLogUnavailableAlert,
} from '../services/callLogService';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

interface CallLogPickerProps {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (entry: {
    mobile: string;
    customer_name: string | null;
    call_date: string | null;
  }) => void;
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

export function CallLogPicker({
  visible,
  onDismiss,
  onSelect,
  isSaving,
}: CallLogPickerProps) {
  const [loading, setLoading] = useState(false);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
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
    setError(null);
    loadCallLogs();
  }, [visible, loadCallLogs]);

  const handleManualAdd = () => {
    const mobile = manualMobile.replace(/\D/g, '').slice(-10);
    if (mobile.length !== 10) {
      Alert.alert('Invalid Number', 'Enter a valid 10-digit mobile number.');
      return;
    }

    onSelect({
      mobile,
      customer_name: manualName.trim() || null,
      call_date: null,
    });
  };

  const handleSelectCall = (entry: CallLogEntry) => {
    onSelect({
      mobile: entry.phoneNumber,
      customer_name: entry.name === 'Unknown' ? null : entry.name,
      call_date: entry.timestamp ? new Date(entry.timestamp).toISOString() : null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Enquiry</Text>
          <IconButton icon="close" onPress={onDismiss} iconColor={colors.white} />
        </View>

        <View style={styles.body}>
          {!manualMode ? (
            <>
              <Text style={styles.subtitle}>
                Select a recent call to add to your enquiries list
              </Text>

              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={colors.royalRed} />
                  <Text style={styles.loadingText}>Loading call logs...</Text>
                </View>
              ) : (
                <FlatList
                  data={callLogs}
                  keyExtractor={(item) => `${item.phoneNumber}-${item.timestamp}`}
                  contentContainerStyle={styles.list}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelectCall(item)}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        styles.callRow,
                        pressed && styles.callRowPressed,
                      ]}
                    >
                      <View style={styles.callIcon}>
                        <MaterialCommunityIcons
                          name="phone-in-talk"
                          size={22}
                          color={colors.royalRed}
                        />
                      </View>
                      <View style={styles.callInfo}>
                        <Text style={styles.callName}>{item.name}</Text>
                        <Text style={styles.callNumber}>{item.phoneNumber}</Text>
                        <Text style={styles.callMeta}>
                          {callTypeLabel(item.type)} • {formatCallTime(item.timestamp)}
                        </Text>
                      </View>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={24}
                        color={colors.goldDark}
                      />
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    error ? <Text style={styles.errorText}>{error}</Text> : null
                  }
                />
              )}

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
                  ? 'Enter enquiry details manually'
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
                Add to Enquiries
              </AppButton>

              {isCallLogSupported() ? (
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
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
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
