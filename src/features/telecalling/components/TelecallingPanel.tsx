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
import { useFocusEffect } from '@react-navigation/native';
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
import { CallLogPickerModal } from './CallLogPickerModal';
import {
  CALLED_BACK_NOTE,
  CreateTelecallingContactInput,
  TelecallingCallOutcome,
  TelecallingContact,
  TelecallingFilterId,
  TELECALLING_FILTERS,
  contactMatchesFilter,
  isNoAnswerBusyStatus,
  resolveTelecallingStatus,
} from '@/types/telecalling';
import { mobileMatchesQuery, normalizeMobile } from '../utils/phoneNormalize';
import { shareStallDetailsOnWhatsApp } from '../services/stallDetailsWhatsAppService';
import {
  ensureCallLogPermission,
  hasCallLogPermission,
  isCallLogSupported,
} from '../services/callLogService';
import { detectIncomingCallbacks } from '../services/callbackAutoDetect';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const OUTCOME_PROMPT_DELAY_MS = 600;
/** How often to re-scan Android call log while Telecalling is open. */
const CALLBACK_SCAN_INTERVAL_MS = 20_000;

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [outcomeContact, setOutcomeContact] =
    useState<TelecallingContact | null>(null);
  const [outcomeVisible, setOutcomeVisible] = useState(false);
  const [phonePickerVisible, setPhonePickerVisible] = useState(false);
  const [callLogPickerVisible, setCallLogPickerVisible] = useState(false);

  const pendingOutcomeIdRef = useRef<string | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const contactsRef = useRef<TelecallingContact[]>([]);
  const callbackMovingRef = useRef<Set<string>>(new Set());
  const callbackPermissionAskedRef = useRef(false);
  const panelFocusedRef = useRef(false);
  const scanningCallbacksRef = useRef(false);

  const isNativeMobile =
    Platform.OS === 'android' || Platform.OS === 'ios';
  const contactCount = contacts?.length ?? 0;
  const busy =
    importing || importMutation.isPending || deleteAllContacts.isPending;

  useEffect(() => {
    contactsRef.current = contacts ?? [];
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    const list: TelecallingContact[] = contacts ?? [];
    // Dedupe by normalized mobile in case older rows slipped past UNIQUE.
    const seen = new Set<string>();
    const unique: TelecallingContact[] = [];
    for (const c of list) {
      const mobile = normalizeMobile(c.mobile);
      if (mobile && seen.has(mobile)) continue;
      if (mobile) seen.add(mobile);
      unique.push(c);
    }
    return unique.filter((c) =>
      contactMatchesFilter(c.call_status, filter, c.last_outcome_notes)
    );
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
    const seen = new Set<string>();
    const unique: TelecallingContact[] = [];
    for (const c of list) {
      const mobile = normalizeMobile(c.mobile);
      if (mobile && seen.has(mobile)) continue;
      if (mobile) seen.add(mobile);
      unique.push(c);
    }
    const counts: Partial<Record<TelecallingFilterId, number>> = {
      all: unique.length,
    };
    for (const f of TELECALLING_FILTERS) {
      if (f.statuses == null) continue;
      counts[f.id] = unique.filter((c) =>
        contactMatchesFilter(c.call_status, f.id, c.last_outcome_notes)
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

  const scanForIncomingCallbacks = useCallback(async () => {
    // iOS cannot read call logs — only Android auto-moves No Answer → Call Back.
    if (!isCallLogSupported() || !panelFocusedRef.current) return;
    if (AppState.currentState !== 'active') return;
    if (scanningCallbacksRef.current) return;

    const list = contactsRef.current;
    const hasNoAnswer = list.some((c) =>
      isNoAnswerBusyStatus(
        resolveTelecallingStatus(c.call_status, c.last_outcome_notes)
      )
    );
    if (!hasNoAnswer) return;

    scanningCallbacksRef.current = true;
    try {
      if (!(await hasCallLogPermission())) {
        if (!callbackPermissionAskedRef.current) {
          callbackPermissionAskedRef.current = true;
          await ensureCallLogPermission();
        }
        if (!(await hasCallLogPermission())) return;
      }

      const matches = await detectIncomingCallbacks(list);
      for (const match of matches) {
        if (callbackMovingRef.current.has(match.contact.id)) continue;
        callbackMovingRef.current.add(match.contact.id);
        try {
          await recordOutcome.mutateAsync({
            contactId: match.contact.id,
            outcome: 'callback',
            notes: match.notes,
          });
        } catch (err) {
          console.warn(
            'Auto Call Back move failed',
            match.contact.id,
            getErrorMessage(err)
          );
        } finally {
          callbackMovingRef.current.delete(match.contact.id);
        }
      }
    } finally {
      scanningCallbacksRef.current = false;
    }
  }, [recordOutcome]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (
        (prev === 'background' || prev === 'inactive') &&
        next === 'active'
      ) {
        if (pendingOutcomeIdRef.current) {
          const id = pendingOutcomeIdRef.current;
          setTimeout(() => openOutcomeFor(id), OUTCOME_PROMPT_DELAY_MS);
        }
        // After Phone app / resume: detect customer call-backs into Call Back.
        setTimeout(() => {
          scanForIncomingCallbacks().catch(() => undefined);
        }, OUTCOME_PROMPT_DELAY_MS + 200);
      }
    });
    return () => sub.remove();
  }, [openOutcomeFor, scanForIncomingCallbacks]);

  useFocusEffect(
    useCallback(() => {
      panelFocusedRef.current = true;
      scanForIncomingCallbacks().catch(() => undefined);

      const intervalId = setInterval(() => {
        scanForIncomingCallbacks().catch(() => undefined);
      }, CALLBACK_SCAN_INTERVAL_MS);

      return () => {
        panelFocusedRef.current = false;
        clearInterval(intervalId);
      };
    }, [scanForIncomingCallbacks])
  );

  const handleCall = async (contact: TelecallingContact) => {
    if (!isNativeMobile) {
      Alert.alert(
        'Calling unavailable',
        'One-tap dialing is available in the iOS and Android apps.'
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
    // No spinner — open WhatsApp immediately.
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
    }
  };

  const handleSaveOutcome = async (
    outcome: TelecallingCallOutcome,
    notes: string
  ) => {
    if (!outcomeContact) return;
    setUpdatingId(outcomeContact.id);
    try {
      await recordOutcome.mutateAsync({
        contactId: outcomeContact.id,
        outcome,
        notes,
      });
      // Stay on the current filter so No answer rows visibly leave that tab.
      setOutcomeVisible(false);
      setOutcomeContact(null);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleQuickOutcome = async (
    contact: TelecallingContact,
    outcome: TelecallingCallOutcome,
    notes?: string
  ) => {
    setUpdatingId(contact.id);
    try {
      await recordOutcome.mutateAsync({
        contactId: contact.id,
        outcome,
        notes: notes ?? '',
      });
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setUpdatingId(null);
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
        'Contacts unavailable',
        'Importing from phone Contacts is available in the iOS and Android apps only.'
      );
      return;
    }
    setPhonePickerVisible(true);
  };

  const handleImportFromCallLog = () => {
    // Android: recent call logs. iOS: same modal falls back to manual number entry
    // (Apple does not allow apps to read the device call history).
    setCallLogPickerVisible(true);
  };

  const importContactBatch = async (
    contacts: CreateTelecallingContactInput[],
    sourceLabel: string
  ) => {
    if (!contacts.length) {
      Alert.alert(
        'No contacts selected',
        'Select at least one contact with a valid 10-digit phone number.'
      );
      return;
    }

    setImporting(true);
    try {
      const { inserted, skippedExisting } =
        await importMutation.mutateAsync(contacts);

      setFilter('all');
      if (inserted.length === 0 && skippedExisting > 0) {
        Alert.alert(
          'Already in list',
          `All ${skippedExisting} selected number(s) are already in tele-calling (or duplicates). Nothing new was added.`
        );
      } else {
        Alert.alert(
          'Import complete',
          `Added ${inserted.length} from ${sourceLabel}.` +
            (skippedExisting
              ? ` Skipped ${skippedExisting} already in tele-calling / duplicates.`
              : '')
        );
      }
    } catch (err) {
      Alert.alert('Import failed', getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const handlePhonePickerConfirm = async (
    selected: DeviceContactOption[]
  ) => {
    setPhonePickerVisible(false);
    await importContactBatch(deviceOptionsToImportInputs(selected), 'phone');
  };

  const handleCallLogConfirm = async (
    contacts: CreateTelecallingContactInput[]
  ) => {
    setCallLogPickerVisible(false);
    await importContactBatch(
      contacts,
      isCallLogSupported() ? 'call log' : 'manual entry'
    );
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
      `Delete all ${contactCount} contacts from tele-calling?\n\nCall history for these contacts will also be removed. You can import again afterward.\n\nThis cannot be undone.`,
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

  if (!isNativeMobile) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="cellphone-off"
          message="Tele-calling is available in the iOS and Android apps only."
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
            Excel
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
            Phone
          </AppButton>
          <AppButton
            icon={isCallLogSupported() ? 'phone-log' : 'dialpad'}
            variant="tonal"
            onPress={handleImportFromCallLog}
            loading={busy}
            compact
            style={styles.importBtn}
            contentStyle={styles.importBtnContent}
            labelStyle={styles.importBtnLabel}
          >
            {isCallLogSupported() ? 'Call log' : 'Add #'}
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
        extraData={{ filter, searchQuery, callingId, updatingId }}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const status = resolveTelecallingStatus(
            item.call_status,
            item.last_outcome_notes
          );
          const inNoAnswer = isNoAnswerBusyStatus(status);
          return (
            <TelecallingContactRow
              contact={{
                ...item,
                call_status: status,
              }}
              index={index}
              calling={callingId === item.id}
              sending={false}
              updating={updatingId === item.id}
              onCall={() => handleCall(item)}
              onSendDetails={() => handleSendDetails(item)}
              onUpdateStatus={() => openOutcomeFor(item.id)}
              onGotThrough={
                inNoAnswer
                  ? () => handleQuickOutcome(item, 'connected')
                  : undefined
              }
              onCalledBack={
                inNoAnswer
                  ? () =>
                      handleQuickOutcome(item, 'callback', CALLED_BACK_NOTE)
                  : undefined
              }
              onDelete={() => handleDelete(item)}
            />
          );
        }}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="phone-outgoing"
              message={
                (contacts?.length ?? 0) === 0
                  ? isCallLogSupported()
                    ? 'No contacts yet. Import from Excel, phone, or call log.'
                    : 'No contacts yet. Import from Excel or phone, or add a number.'
                  : searchQuery.trim()
                    ? 'No contacts found'
                    : filter === 'no_answer_busy'
                      ? isCallLogSupported()
                        ? 'No unanswered calls. When someone calls you back, they move to Call Back automatically (or tap Called back).'
                        : 'No unanswered calls. On iOS, tap Called back when they return your call (call log auto-detect needs Android).'
                      : filter === 'callback'
                        ? 'No Call Back contacts yet. People who return your no-answer call appear here.'
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

      <CallLogPickerModal
        visible={callLogPickerVisible}
        onDismiss={() => setCallLogPickerVisible(false)}
        onConfirm={handleCallLogConfirm}
        isSaving={busy}
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
