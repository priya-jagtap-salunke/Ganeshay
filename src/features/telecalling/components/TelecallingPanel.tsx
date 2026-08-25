import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  Alert,
  View,
  AppState,
  type AppStateStatus,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  useDeleteAllTelecallingContacts,
  useDeleteTelecallingContact,
  useImportTelecallingContacts,
  useRecordCallOutcome,
  useTelecallingContacts,
} from '../hooks/useTelecallingContacts';
import { markTelecallingSynced } from '../api/telecallingApi';
import { dialMobile } from '../services/dialService';
import {
  isDeviceContactsSupported,
  deviceOptionsToImportInputs,
  type DeviceContactOption,
  syncContactsToDevice,
} from '../services/deviceContactsService';
import {
  EXCEL_FORMAT_HINT,
  parseTelecallingExcel,
} from '../utils/parseExcelContacts';
import { Searchbar } from 'react-native-paper';
import { TelecallingContactRow } from './TelecallingContactRow';
import { TelecallingFilterBar } from './TelecallingFilterBar';
import { CallOutcomeModal } from './CallOutcomeModal';
import { DeviceContactsPickerModal } from './DeviceContactsPickerModal';
import {
  TelecallingCallOutcome,
  TelecallingContact,
  TelecallingFilterId,
  TELECALLING_FILTERS,
  contactMatchesFilter,
  normalizeTelecallingStatus,
} from '@/types/telecalling';
import { mobileMatchesQuery } from '../utils/phoneNormalize';
import { shareStallDetailsOnWhatsApp } from '@/features/enquiries/services/enquiryWhatsAppService';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const OUTCOME_PROMPT_DELAY_MS = 600;

function confirmExcelFormatThenPick(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Upload Excel', EXCEL_FORMAT_HINT, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Choose file', onPress: () => resolve(true) },
    ]);
  });
}

export function TelecallingPanel() {
  const queryClient = useQueryClient();
  const settings = useSettingsStore();
  const { data: contacts, isLoading } = useTelecallingContacts();
  const importMutation = useImportTelecallingContacts();
  const recordOutcome = useRecordCallOutcome();
  const deleteContact = useDeleteTelecallingContact();
  const deleteAllContacts = useDeleteAllTelecallingContacts();

  const [filter, setFilter] = useState<TelecallingFilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [outcomeContact, setOutcomeContact] =
    useState<TelecallingContact | null>(null);
  const [outcomeVisible, setOutcomeVisible] = useState(false);
  const [phonePickerVisible, setPhonePickerVisible] = useState(false);

  const pendingOutcomeIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isAndroid = Platform.OS === 'android';
  const contactCount = contacts?.length ?? 0;
  const busy =
    importing || importMutation.isPending || deleteAllContacts.isPending;

  const filteredContacts = useMemo(() => {
    const list: TelecallingContact[] = contacts ?? [];
    return list.filter((c) => contactMatchesFilter(c.call_status, filter));
  }, [contacts, filter]);

  /** Tab filter first, then name/phone search — does not change underlying counts. */
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
    const list: TelecallingContact[] = contacts ?? [];
    const counts: Partial<Record<TelecallingFilterId, number>> = {
      all: list.length,
    };
    for (const f of TELECALLING_FILTERS) {
      if (f.statuses == null) continue;
      counts[f.id] = list.filter((c) =>
        contactMatchesFilter(c.call_status, f.id)
      ).length;
    }
    return counts;
  }, [contacts]);

  const openOutcomeFor = useCallback(
    (contactId: string) => {
      const contact = (contacts ?? []).find(
        (c: TelecallingContact) => c.id === contactId
      );
      if (!contact) return;
      setOutcomeContact(contact);
      setOutcomeVisible(true);
      pendingOutcomeIdRef.current = null;
    },
    [contacts]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (
        (prev === 'background' || prev === 'inactive') &&
        next === 'active' &&
        pendingOutcomeIdRef.current
      ) {
        const id = pendingOutcomeIdRef.current;
        setTimeout(() => openOutcomeFor(id), OUTCOME_PROMPT_DELAY_MS);
      }
    });
    return () => sub.remove();
  }, [openOutcomeFor]);

  const handleCall = async (contact: TelecallingContact) => {
    if (!isAndroid) {
      Alert.alert(
        'Android only',
        'One-tap dialing is available on the Android app.'
      );
      return;
    }

    setCallingId(contact.id);
    try {
      pendingOutcomeIdRef.current = contact.id;
      await dialMobile(contact.mobile);
      setTimeout(() => {
        if (
          pendingOutcomeIdRef.current === contact.id &&
          AppState.currentState === 'active'
        ) {
          openOutcomeFor(contact.id);
        }
      }, 2500);
    } catch (err) {
      pendingOutcomeIdRef.current = null;
      Alert.alert('Call failed', getErrorMessage(err));
    } finally {
      setCallingId(null);
    }
  };

  const handleSendDetails = async (contact: TelecallingContact) => {
    setSendingId(contact.id);
    try {
      await shareStallDetailsOnWhatsApp(
        {
          mobile: contact.mobile,
          customerName: contact.name,
        },
        settings
      );
    } catch (err) {
      Alert.alert('WhatsApp Error', getErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  const handleSaveOutcome = async (
    outcome: TelecallingCallOutcome,
    notes: string
  ) => {
    if (!outcomeContact) return;
    try {
      await recordOutcome.mutateAsync({
        contactId: outcomeContact.id,
        outcome,
        notes,
      });
      // Keep contact visible with updated feedback chip
      setFilter('all');
      setOutcomeVisible(false);
      setOutcomeContact(null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const runExcelImport = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
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

      let deviceMsg = '';
      if (isDeviceContactsSupported() && inserted.length > 0) {
        try {
          const sync = await syncContactsToDevice(inserted);
          const syncedIds = inserted.map((c) => c.id);
          if (sync.added > 0) {
            await markTelecallingSynced(syncedIds, true);
            await queryClient.invalidateQueries({
              queryKey: ['telecalling_contacts'],
            });
          }
          deviceMsg = `\nPhone: ${sync.added} added, ${sync.skippedExisting} already on phone${
            sync.failed ? `, ${sync.failed} failed` : ''
          }.`;
        } catch (syncErr) {
          deviceMsg = `\nPhone sync: ${getErrorMessage(syncErr)}`;
        }
      }

      setFilter('all');
      Alert.alert(
        'Import complete',
        `Saved ${inserted.length} new.` +
          (skippedExisting ? ` Skipped ${skippedExisting} existing.` : '') +
          (parsed.skippedInvalid
            ? ` Skipped ${parsed.skippedInvalid} invalid.`
            : '') +
          (parsed.skippedDuplicateInFile
            ? ` Skipped ${parsed.skippedDuplicateInFile} duplicates in file.`
            : '') +
          deviceMsg
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

  const handleImportFromPhone = () => {
    if (!isDeviceContactsSupported()) {
      Alert.alert(
        'Android only',
        'Importing from phone Contacts is available on the Android app only.'
      );
      return;
    }
    setPhonePickerVisible(true);
  };

  const handlePhonePickerConfirm = async (
    selected: DeviceContactOption[]
  ) => {
    setPhonePickerVisible(false);
    if (!selected.length) {
      Alert.alert(
        'No contacts selected',
        'Select at least one contact with a valid 10-digit Indian mobile.'
      );
      return;
    }

    setImporting(true);
    try {
      const contacts = deviceOptionsToImportInputs(selected);
      const { inserted, skippedExisting } =
        await importMutation.mutateAsync(contacts);

      setFilter('all');
      Alert.alert(
        'Import complete',
        `Added ${inserted.length} from phone.` +
          (skippedExisting
            ? ` Skipped ${skippedExisting} already in tele-calling.`
            : '')
      );
    } catch (err) {
      Alert.alert('Import failed', getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = (contact: TelecallingContact) => {
    Alert.alert(
      'Delete contact',
      `Remove ${contact.name} (${contact.mobile})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteContact.mutate(contact.id, {
              onError: (err) => Alert.alert('Error', getErrorMessage(err)),
            });
          },
        },
      ]
    );
  };

  const handleClearAllContacts = () => {
    if (contactCount === 0) {
      Alert.alert('No contacts', 'There are no tele-calling contacts to delete.');
      return;
    }

    Alert.alert(
      'Start fresh tele-calling?',
      `Delete all ${contactCount} contacts from tele-calling?\n\nCall history for these contacts will also be removed. You can import again from Excel or phone after this.\n\nThis cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: () => {
            deleteAllContacts.mutate(undefined, {
              onSuccess: (deleted) => {
                setFilter('all');
                setSearchQuery('');
                setOutcomeVisible(false);
                setOutcomeContact(null);
                Alert.alert(
                  'Tele-calling cleared',
                  deleted > 0
                    ? `Removed ${deleted} contacts. You can start fresh now.`
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

  if (!isAndroid) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="cellphone-off"
          message="Tele-calling is available on the Android app only."
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LoadingOverlay visible={(isLoading && !contacts) || busy} />

      {/* Fixed top: compact actions — never scrolls with the list */}
      <View
        style={[
          styles.fixedTop,
          { backgroundColor: colors.warmIvory, borderBottomColor: colors.grayLight },
        ]}
      >
        <View style={styles.importRow}>
          <AppButton
            icon="file-excel"
            onPress={handleImportExcel}
            loading={busy}
            compact
            style={styles.importBtn}
            contentStyle={styles.importBtnContent}
            labelStyle={styles.importBtnLabel}
          >
            Upload Excel
          </AppButton>
          <AppButton
            icon="account-plus-outline"
            variant="tonal"
            onPress={handleImportFromPhone}
            loading={busy}
            compact
            style={styles.importBtn}
            contentStyle={styles.importBtnContent}
            labelStyle={styles.importBtnLabel}
          >
            From phone
          </AppButton>
        </View>
        {contactCount > 0 ? (
          <AppButton
            icon="delete-sweep-outline"
            variant="outline"
            onPress={handleClearAllContacts}
            loading={deleteAllContacts.isPending}
            disabled={busy}
            compact
            style={styles.clearAllBtn}
            contentStyle={styles.importBtnContent}
            labelStyle={styles.clearAllLabel}
          >
            Clear all / Start fresh
          </AppButton>
        ) : null}
      </View>

      {/* Sticky filters — always visible above the scrolling contact list */}
      <TelecallingFilterBar
        value={filter}
        onChange={setFilter}
        counts={filterCounts}
      />

      <View
        style={[
          styles.searchWrap,
          {
            backgroundColor: colors.warmIvory,
            borderBottomColor: colors.grayLight,
          },
        ]}
      >
        <Searchbar
          placeholder="Search contacts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.search}
          inputStyle={styles.searchInput}
        />
      </View>

      <FlatList
        style={styles.listFlex}
        data={displayedContacts}
        keyExtractor={(item) => item.id}
        extraData={{ filter, searchQuery, callingId, sendingId }}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <TelecallingContactRow
            contact={{
              ...item,
              call_status: normalizeTelecallingStatus(item.call_status),
            }}
            index={index}
            calling={callingId === item.id}
            sending={sendingId === item.id}
            onCall={() => handleCall(item)}
            onSendDetails={() => handleSendDetails(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="phone-outgoing"
              message={
                (contacts?.length ?? 0) === 0
                  ? 'No contacts yet. Upload Excel or pick from phone.'
                  : searchQuery.trim()
                    ? 'No contacts found'
                    : 'Nothing in this filter.'
              }
            />
          ) : null
        }
      />

      <CallOutcomeModal
        visible={outcomeVisible}
        contact={outcomeContact}
        saving={recordOutcome.isPending}
        onDismiss={() => {
          setOutcomeVisible(false);
          setOutcomeContact(null);
        }}
        onSave={handleSaveOutcome}
      />

      <DeviceContactsPickerModal
        visible={phonePickerVisible}
        onDismiss={() => setPhonePickerVisible(false)}
        onConfirm={handlePhonePickerConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fixedTop: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  importRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  importBtn: {
    flex: 1,
    marginVertical: 0,
  },
  importBtnContent: {
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  importBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  clearAllBtn: {
    marginTop: spacing.sm,
    marginVertical: 0,
  },
  clearAllLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  search: {
    elevation: 0,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    height: 44,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 14,
  },
  listFlex: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
});
