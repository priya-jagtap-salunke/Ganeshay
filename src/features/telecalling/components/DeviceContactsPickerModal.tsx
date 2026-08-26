import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { Text, Checkbox, Searchbar, IconButton } from 'react-native-paper';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<DeviceContactOption[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [accessLimited, setAccessLimited] = useState(false);

  const resetState = useCallback(() => {
    setOptions([]);
    setSelectedKeys(new Set());
    setQuery('');
    setError(null);
    setAccessLimited(false);
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
        if (result.accessLimited && result.options.length === 0) {
          Alert.alert(
            'Limited Contacts access',
            'iPhone only shared some contacts with Ganeshay. Open Settings → Ganeshay → Contacts and choose “Full Access”, or pick more contacts, then try again.'
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, resetState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        mobileMatchesQuery(opt.mobile, query)
    );
  }, [options, query]);

  const selectedCount = selectedKeys.size;
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((opt) => selectedKeys.has(opt.key));

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
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
      return next;
    });
  };

  const handleConfirm = () => {
    const selected = options.filter((opt) => selectedKeys.has(opt.key));
    onConfirm(selected);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={loading ? undefined : onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select phone contacts</Text>
          <IconButton
            icon="close"
            onPress={loading ? undefined : onDismiss}
            iconColor={colors.white}
            disabled={loading}
          />
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>
            Choose who to add to tele-calling. Only selected contacts are
            imported. Duplicate numbers already in your list are skipped.
          </Text>

          {accessLimited ? (
            <Text style={styles.limitedHint}>
              Limited Contacts access — only contacts you shared with Ganeshay
              appear here.
            </Text>
          ) : null}

          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.royalRed} />
              <Text style={styles.loadingText}>Loading phone contacts…</Text>
            </View>
          ) : error ? (
            <View style={styles.centered}>
              <EmptyState icon="alert-circle-outline" message={error} />
              <AppButton
                variant="outline"
                onPress={onDismiss}
                style={styles.closeBtn}
              >
                Close
              </AppButton>
            </View>
          ) : (
            <>
              <Searchbar
                placeholder="Search name or number"
                value={query}
                onChangeText={setQuery}
                style={styles.search}
                inputStyle={styles.searchInput}
              />

              <View style={styles.toolbar}>
                <Text style={styles.toolbarLabel}>
                  {selectedCount} selected
                  {options.length
                    ? ` · ${options.length} with valid mobile`
                    : ''}
                </Text>
                {filtered.length > 0 ? (
                  <Pressable onPress={toggleSelectAllFiltered} hitSlop={8}>
                    <Text style={styles.selectAll}>
                      {allFilteredSelected
                        ? 'Clear visible'
                        : query.trim()
                          ? 'Select all visible'
                          : 'Select all'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <FlatList
                data={filtered}
                keyExtractor={(item) => item.key}
                extraData={{ query, selectedKeys, selectedCount }}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <EmptyState
                    icon="account-off-outline"
                    message={
                      options.length === 0
                        ? accessLimited
                          ? 'No shared contacts with a valid Indian mobile. Allow Full Access in Settings, or share more contacts.'
                          : 'No valid Indian mobile numbers found on this phone.'
                        : 'No contacts match your search.'
                    }
                  />
                }
                renderItem={({ item }) => {
                  const checked = selectedKeys.has(item.key);
                  return (
                    <Pressable
                      onPress={() => toggleKey(item.key)}
                      style={({ pressed }) => [
                        styles.row,
                        checked && styles.rowSelected,
                        pressed && styles.rowPressed,
                      ]}
                    >
                      <Checkbox
                        status={checked ? 'checked' : 'unchecked'}
                        onPress={() => toggleKey(item.key)}
                        color={colors.royalRed}
                      />
                      <View style={styles.rowText}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.rowMobile}>{item.mobile}</Text>
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
                  disabled={selectedCount === 0}
                  style={styles.actionBtn}
                >
                  {selectedCount > 0 ? `Import ${selectedCount}` : 'Import'}
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
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    flex: 1,
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  limitedHint: {
    fontSize: 13,
    color: colors.royalRed,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  search: {
    marginBottom: spacing.xs,
    backgroundColor: colors.white,
    elevation: 0,
  },
  searchInput: {
    minHeight: 40,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    minHeight: touchTarget.min / 1.5,
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
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    paddingLeft: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.goldLight,
    minHeight: touchTarget.min,
  },
  rowSelected: {
    borderColor: colors.royalRed,
    backgroundColor: colors.warmIvory,
  },
  rowPressed: {
    opacity: 0.9,
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
  closeBtn: {
    marginTop: spacing.md,
  },
});
