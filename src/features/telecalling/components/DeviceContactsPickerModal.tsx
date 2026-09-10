import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Text, Checkbox, Searchbar, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  DeviceContactOption,
  loadDeviceContactOptions,
} from '../services/deviceContactsService';
import { mobileMatchesQuery } from '../utils/phoneNormalize';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing, touchTarget } from '@/theme/spacing';

interface DeviceContactsPickerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (selected: DeviceContactOption[]) => void;
}

export function DeviceContactsPickerModal({
  visible,
  onDismiss,
  onConfirm,
}: DeviceContactsPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<DeviceContactOption[]>([]);
  // Use string[] (not Set) so FlatList extraData / selection UI always updates.
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [accessLimited, setAccessLimited] = useState(false);
  const [deviceContactCount, setDeviceContactCount] = useState(0);
  const [skippedInvalid, setSkippedInvalid] = useState(0);
  const [loadNonce, setLoadNonce] = useState(0);

  const selectedKeySet = useMemo(
    () => new Set(selectedKeys),
    [selectedKeys]
  );

  const resetState = useCallback(() => {
    setOptions([]);
    setSelectedKeys([]);
    setQuery('');
    setError(null);
    setAccessLimited(false);
    setDeviceContactCount(0);
    setSkippedInvalid(0);
  }, []);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDeviceContactOptions()
      .then((result) => {
        if (cancelled) return;
        setOptions(result.options);
        setAccessLimited(result.accessLimited);
        setDeviceContactCount(result.deviceContactCount);
        setSkippedInvalid(result.skippedInvalid);
        // Auto-select all so Import is immediately tappable.
        setSelectedKeys(result.options.map((opt) => opt.key));
        if (result.accessLimited) {
          Alert.alert(
            'Limited Contacts access',
            `Only ${result.options.length} contact(s) are available to Ganeshay.\n\nTo import your full phone book: open Settings → Ganeshay → Contacts → Full Access, then tap Reload in this screen.`
          );
        } else if (
          result.deviceContactCount > 0 &&
          result.options.length > 0 &&
          result.options.length < 30 &&
          result.skippedInvalid > result.options.length
        ) {
          // Many phone-book rows had no usable 10-digit number — still show what we can.
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
        setSelectedKeys([]);
        setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, resetState, loadNonce]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;

    const matches = options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        mobileMatchesQuery(opt.mobile, query)
    );

    const byName = (a: DeviceContactOption, b: DeviceContactOption) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

    const prefix: DeviceContactOption[] = [];
    const rest: DeviceContactOption[] = [];
    for (const opt of matches) {
      if (opt.name.toLowerCase().startsWith(q)) prefix.push(opt);
      else rest.push(opt);
    }
    prefix.sort(byName);
    rest.sort(byName);
    return [...prefix, ...rest];
  }, [options, query]);

  const selectedCount = selectedKeys.length;
  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((opt) => selectedKeySet.has(opt.key));

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      if (prev.includes(key)) {
        return prev.filter((k) => k !== key);
      }
      return [...prev, key];
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const opt of filtered) next.delete(opt.key);
      } else {
        for (const opt of filtered) next.add(opt.key);
      }
      return [...next];
    });
  };

  const handleConfirm = () => {
    if (selectedCount === 0) {
      Alert.alert(
        'No contacts selected',
        'Select at least one contact, or tap Select all, then Import.'
      );
      return;
    }
    const byKey = new Map(options.map((opt) => [opt.key, opt]));
    const selected: DeviceContactOption[] = [];
    for (const key of selectedKeys) {
      const opt = byKey.get(key);
      if (opt) selected.push(opt);
    }
    if (selected.length === 0) {
      Alert.alert(
        'No contacts selected',
        'Could not resolve the selected contacts. Close and try again.'
      );
      return;
    }
    onConfirm(selected);
  };

  const handleReload = () => {
    setLoadNonce((n) => n + 1);
  };

  const emptyMessage = (() => {
    if (options.length > 0) return 'No contacts match your search.';
    if (accessLimited) {
      return 'Limited Contacts access. Open Settings → Ganeshay → Contacts → Full Access, then tap Reload.';
    }
    if (deviceContactCount > 0) {
      return `Read ${deviceContactCount} phone-book contact(s), but none had a usable 10-digit phone number.${
        skippedInvalid
          ? ` Skipped ${skippedInvalid} without a phone.`
          : ''
      }`;
    }
    return 'No contacts found. Allow Contacts permission (Full Access on iPhone), then tap Reload.';
  })();

  const validMobileCount = options.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={loading ? undefined : onDismiss}
      presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
    >
      <View style={styles.container}>
        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top, spacing.sm) },
          ]}
        >
          <Text style={styles.title} numberOfLines={1}>
            Select phone contacts
          </Text>
          <IconButton
            icon="close"
            size={22}
            onPress={loading ? undefined : onDismiss}
            iconColor={colors.white}
            disabled={loading}
            style={styles.closeIcon}
            accessibilityLabel="Close"
          />
        </View>

        <View
          style={[
            styles.body,
            { paddingBottom: Math.max(insets.bottom, spacing.sm) },
          ]}
        >
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.royalRed} />
              <Text style={styles.loadingText}>Loading phone contacts…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <EmptyState icon="alert-circle-outline" message={error} />
              <AppButton
                variant="primary"
                onPress={handleReload}
                style={styles.errorBtn}
              >
                Reload
              </AppButton>
              <AppButton
                variant="outline"
                onPress={onDismiss}
                style={styles.errorBtn}
              >
                Close
              </AppButton>
            </View>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Choose who to add to tele-calling. Only selected contacts are
                imported. Duplicate numbers already in your list are skipped.
              </Text>

              <Searchbar
                placeholder="Search name or number"
                value={query}
                onChangeText={setQuery}
                style={styles.search}
                inputStyle={styles.searchInput}
                iconColor={colors.gray}
              />

              <View style={styles.toolbar}>
                <Text style={styles.toolbarLabel} numberOfLines={1}>
                  {selectedCount} selected
                  {validMobileCount > 0
                    ? ` · ${validMobileCount} with valid mobile`
                    : ''}
                </Text>
                {filtered.length > 0 ? (
                  <Pressable onPress={toggleSelectAllFiltered} hitSlop={8}>
                    <Text style={styles.selectAll}>
                      {allFilteredSelected ? 'Clear all' : 'Select all'}
                    </Text>
                  </Pressable>
                ) : options.length === 0 ? (
                  <Pressable onPress={handleReload} hitSlop={8}>
                    <Text style={styles.selectAll}>Reload</Text>
                  </Pressable>
                ) : null}
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.key}
                extraData={selectedKeys}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <EmptyState
                    icon="account-off-outline"
                    message={emptyMessage}
                  />
                }
                renderItem={({ item }) => {
                  const checked = selectedKeySet.has(item.key);
                  return (
                    <Pressable
                      onPress={() => toggleKey(item.key)}
                      style={({ pressed }) => [
                        styles.row,
                        pressed && styles.rowPressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      accessibilityLabel={`${item.name}, ${item.mobile}`}
                    >
                      {/* pointerEvents none — avoid Checkbox+Pressable double toggle */}
                      <View pointerEvents="none">
                        <Checkbox
                          status={checked ? 'checked' : 'unchecked'}
                          color={colors.royalRed}
                        />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowMobile} numberOfLines={1}>
                          {item.mobile}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
              />

              <View style={styles.actions}>
                <AppButton
                  variant="outline"
                  onPress={onDismiss}
                  style={styles.actionBtn}
                >
                  Cancel
                </AppButton>
                <AppButton
                  onPress={handleConfirm}
                  disabled={selectedCount === 0 || options.length === 0}
                  style={styles.actionBtn}
                >
                  Import
                </AppButton>
              </View>
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    paddingRight: spacing.sm,
  },
  closeIcon: {
    margin: 0,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.warmIvory,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  search: {
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    elevation: 0,
    shadowOpacity: 0,
  },
  searchInput: {
    minHeight: 40,
    fontSize: 15,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    minHeight: touchTarget.min / 1.5,
    gap: spacing.sm,
  },
  toolbarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  selectAll: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.royalRed,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: touchTarget.min,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowText: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowMobile: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.royalRed,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    marginVertical: 0,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  errorBtn: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
