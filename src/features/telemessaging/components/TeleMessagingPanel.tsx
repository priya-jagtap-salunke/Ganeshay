import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Alert, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Searchbar, Text } from 'react-native-paper';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  useDeleteAllTelecallingContacts,
  useImportTelecallingContacts,
  useRecordMessageOutcome,
  useTelecallingContacts,
} from '@/features/telecalling/hooks/useTelecallingContacts';
import {
  EXCEL_FORMAT_HINT,
  parseTelecallingExcel,
} from '@/features/telecalling/utils/parseExcelContacts';
import { TelecallingContact } from '@/types/telecalling';
import {
  TeleMessagingFilterId,
  TeleMessagingKind,
  TELEMESSAGING_FILTERS,
  contactMatchesMessageFilter,
} from '@/types/telemessaging';
import {
  mobileMatchesQuery,
  normalizeMobile,
} from '@/features/telecalling/utils/phoneNormalize';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { TeleMessagingContactRow } from './TeleMessagingContactRow';
import { TeleMessagingFilterBar } from './TeleMessagingFilterBar';
import {
  sharePredraftedMessageOnWhatsApp,
  shareReviewRequestMessageOnWhatsApp,
} from '../services/telemessagingWhatsAppService';

function uniqueContacts(list: TelecallingContact[]): TelecallingContact[] {
  const seen = new Set<string>();
  const unique: TelecallingContact[] = [];
  for (const c of list) {
    const mobile = normalizeMobile(c.mobile);
    if (mobile && seen.has(mobile)) continue;
    if (mobile) seen.add(mobile);
    unique.push(c);
  }
  return unique;
}

function confirmExcelFormatThenPick(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Upload Excel', EXCEL_FORMAT_HINT, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Choose file', onPress: () => resolve(true) },
    ]);
  });
}

export function TeleMessagingPanel() {
  const settings = useSettingsStore();
  const {
    data: contacts,
    isLoading,
    isRefetching,
    refetch,
  } = useTelecallingContacts();
  const importMutation = useImportTelecallingContacts();
  const deleteAllContacts = useDeleteAllTelecallingContacts();
  const recordOutcome = useRecordMessageOutcome();

  const [filter, setFilter] = useState<TeleMessagingFilterId>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);

  const contactCount = contacts?.length ?? 0;

  const filteredContacts = useMemo(() => {
    const unique = uniqueContacts(contacts ?? []);
    return unique.filter((c) =>
      contactMatchesMessageFilter(c.message_status, filter)
    );
  }, [contacts, filter]);

  const displayedContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return filteredContacts;
    return filteredContacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        mobileMatchesQuery(c.mobile, searchQuery)
    );
  }, [filteredContacts, searchQuery]);

  const filterCounts = useMemo(() => {
    const unique = uniqueContacts(contacts ?? []);
    const counts: Partial<Record<TeleMessagingFilterId, number>> = {};
    for (const def of TELEMESSAGING_FILTERS) {
      counts[def.id] = unique.filter((c) =>
        contactMatchesMessageFilter(c.message_status, def.id)
      ).length;
    }
    return counts;
  }, [contacts]);

  const markSent = async (
    contact: TelecallingContact,
    kind: TeleMessagingKind
  ) => {
    try {
      await recordOutcome.mutateAsync({
        contactId: contact.id,
        outcome: 'sent',
        messageKind: kind,
        notes: 'Details sent on WhatsApp',
      });
      // Move to Sent tab so the contact appears there immediately.
      setFilter('sent');
    } catch (error) {
      Alert.alert(
        'Status Not Saved',
        getErrorMessage(error) ||
          'WhatsApp opened, but message status could not be saved. Run supabase/telemessaging-migration.sql if needed.'
      );
    }
  };

  /**
   * Send → predrafted stall details message (includes https://bappaji.com/).
   */
  const handleSendWhatsApp = (contact: TelecallingContact) => {
    Alert.alert('Send WhatsApp', 'Choose what to send', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send details',
        onPress: () => {
          void (async () => {
            try {
              await sharePredraftedMessageOnWhatsApp(
                {
                  mobile: contact.mobile,
                  customerName: contact.name,
                },
                settings
              );
              await markSent(contact, 'predraft');
            } catch (error) {
              if (!getErrorMessage(error).toLowerCase().includes('cancel')) {
                Alert.alert(
                  'WhatsApp Failed',
                  getErrorMessage(error) || 'Could not open WhatsApp.'
                );
              }
            }
          })();
        },
      },
      {
        text: 'Review & Request',
        onPress: () => {
          void (async () => {
            try {
              await shareReviewRequestMessageOnWhatsApp({
                mobile: contact.mobile,
                customerName: contact.name,
              });
            } catch (error) {
              if (!getErrorMessage(error).toLowerCase().includes('cancel')) {
                Alert.alert(
                  'WhatsApp Failed',
                  getErrorMessage(error) || 'Could not open WhatsApp.'
                );
              }
            }
          })();
        },
      },
    ]);
  };

  const runExcelImport = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const parsed = await parseTelecallingExcel(result.assets[0].uri);
      const { inserted, skippedExisting } = await importMutation.mutateAsync(
        parsed.contacts
      );

      Alert.alert(
        'Import complete',
        `Saved ${inserted.length} new.` +
          (skippedExisting ? ` Skipped ${skippedExisting} existing.` : '') +
          (parsed.skippedInvalid
            ? ` Skipped ${parsed.skippedInvalid} invalid.`
            : '') +
          (parsed.skippedDuplicateInFile
            ? ` Skipped ${parsed.skippedDuplicateInFile} duplicates in file.`
            : '')
      );
    } catch (err) {
      Alert.alert('Import failed', getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcel = async () => {
    const proceed = await confirmExcelFormatThenPick();
    if (!proceed) return;
    await runExcelImport();
  };

  const handleRefresh = async () => {
    try {
      await refetch();
    } catch (err) {
      Alert.alert('Refresh failed', getErrorMessage(err));
    }
  };

  const handleClearAllContacts = () => {
    if (contactCount === 0) {
      Alert.alert('No contacts', 'There are no contacts to clear.');
      return;
    }

    Alert.alert(
      'Clear all contacts?',
      `Delete all ${contactCount} contacts from Tele-Messaging?\n\nThe same list is shared with Tele-calling. You can import again afterward.\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => {
            deleteAllContacts.mutate(undefined, {
              onSuccess: (deleted) => {
                setFilter('pending');
                setSearchQuery('');
                Alert.alert(
                  'Contacts cleared',
                  deleted > 0
                    ? `Removed ${deleted} contacts. You can import again now.`
                    : 'No contacts were left to remove.'
                );
              },
              onError: (err) => Alert.alert('Error', getErrorMessage(err)),
            });
          },
        },
      ]
    );
  };

  if (isLoading && !contacts) {
    return (
      <View style={styles.root}>
        <LoadingOverlay visible />
      </View>
    );
  }

  const emptyMessage =
    contactCount === 0
      ? 'Import contacts first. The same list appears here for WhatsApp messaging.'
      : filter === 'pending'
        ? 'No pending contacts. Everyone here is already in Sent.'
        : 'No sent contacts yet. Send WhatsApp from Pending.';

  const busy =
    importing ||
    importMutation.isPending ||
    deleteAllContacts.isPending ||
    isRefetching;

  return (
    <View style={styles.root}>
      <LoadingOverlay visible={busy} />
      <View style={styles.header}>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          {contactCount === 0
            ? 'Import contacts first. The same list appears here for WhatsApp messaging.'
            : `${contactCount} contact${contactCount === 1 ? '' : 's'} · Send → details · auto-moves to Sent`}
        </Text>
        <View style={styles.actionRow}>
          <AppButton
            icon="file-excel"
            variant="tonal"
            compact
            onPress={handleImportExcel}
            loading={busy}
            disabled={busy}
            style={styles.actionBtn}
          >
            Import Excel
          </AppButton>
          <AppButton
            icon="refresh"
            variant="outline"
            compact
            onPress={handleRefresh}
            loading={isRefetching}
            disabled={busy}
            style={styles.actionBtn}
          >
            Refresh
          </AppButton>
          {contactCount > 0 ? (
            <AppButton
              icon="delete-sweep-outline"
              variant="outline"
              compact
              onPress={handleClearAllContacts}
              loading={deleteAllContacts.isPending}
              disabled={busy}
              style={styles.actionBtn}
              labelStyle={styles.clearLabel}
            >
              Clear
            </AppButton>
          ) : null}
        </View>
      </View>

      <Searchbar
        placeholder="Search name or mobile"
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.search}
        inputStyle={{ minHeight: 0 }}
      />

      <TeleMessagingFilterBar
        value={filter}
        onChange={setFilter}
        counts={filterCounts}
      />

      {displayedContacts.length === 0 ? (
        <EmptyState icon="whatsapp" message={emptyMessage} />
      ) : (
        <FlatList
          data={displayedContacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <TeleMessagingContactRow
              contact={item}
              index={index}
              onSendWhatsApp={() => handleSendWhatsApp(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    marginVertical: 0,
  },
  clearLabel: {
    color: colors.error,
  },
  search: {
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    elevation: 0,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
});
