import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Modal,
  Portal,
  Text,
  Checkbox,
  Searchbar,
  useTheme,
} from 'react-native-paper';
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
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<DeviceContactOption[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const resetState = useCallback(() => {
    setOptions([]);
    setSelectedKeys(new Set());
    setQuery('');
    setError(null);
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
    <Portal>
      <Modal
        visible={visible}
        onDismiss={loading ? undefined : onDismiss}
        contentContainerStyle={[
          styles.sheet,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          Select phone contacts
        </Text>
        <Text
          variant="bodySmall"
          style={{
            color: theme.colors.onSurfaceVariant,
            marginTop: spacing.xs,
            marginBottom: spacing.sm,
          }}
        >
          Choose who to add to tele-calling. Only selected contacts are imported.
        </Text>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }}
            >
              Loading phone contacts…
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <EmptyState icon="alert-circle-outline" message={error} />
            <AppButton variant="outline" onPress={onDismiss} style={styles.closeBtn}>
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
              <Text
                variant="labelLarge"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {selectedCount} selected
                {options.length ? ` · ${options.length} with valid mobile` : ''}
              </Text>
              {filtered.length > 0 ? (
                <Pressable onPress={toggleSelectAllFiltered} hitSlop={8}>
                  <Text
                    variant="labelLarge"
                    style={{ color: theme.colors.primary, fontWeight: '600' }}
                  >
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
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState
                  icon="account-off-outline"
                  message={
                    options.length === 0
                      ? 'No valid Indian mobile numbers found on this phone.'
                      : 'No contacts match your search.'
                  }
                />
              }
              renderItem={({ item }) => {
                const checked = selectedKeys.has(item.key);
                return (
                  <Pressable
                    onPress={() => toggleKey(item.key)}
                    style={[
                      styles.row,
                      {
                        borderBottomColor: theme.colors.outlineVariant,
                        backgroundColor: checked
                          ? theme.colors.secondaryContainer
                          : 'transparent',
                      },
                    ]}
                  >
                    <Checkbox
                      status={checked ? 'checked' : 'unchecked'}
                      onPress={() => toggleKey(item.key)}
                      color={theme.colors.primary}
                    />
                    <View style={styles.rowText}>
                      <Text
                        variant="titleSmall"
                        numberOfLines={1}
                        style={{ color: theme.colors.onSurface }}
                      >
                        {item.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
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
                disabled={selectedCount === 0}
                style={styles.actionBtn}
              >
                {selectedCount > 0 ? `Import ${selectedCount}` : 'Import'}
              </AppButton>
            </View>
          </>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginHorizontal: spacing.sm,
    marginVertical: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    flex: 1,
    maxHeight: '92%',
  },
  search: {
    marginBottom: spacing.xs,
    backgroundColor: colors.warmIvory,
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
  list: {
    flexGrow: 1,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
    borderRadius: radius.sm,
  },
  rowText: {
    flex: 1,
    marginLeft: spacing.xs,
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  closeBtn: {
    marginTop: spacing.md,
  },
});
