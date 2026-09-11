import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Alert, View } from 'react-native';
import { Searchbar, Text } from 'react-native-paper';
import { useRouter, type Href } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  useRecordMessageOutcome,
  useTelecallingContacts,
} from '@/features/telecalling/hooks/useTelecallingContacts';
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
  shareCatalogOnWhatsApp,
  sharePredraftedMessageOnWhatsApp,
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

export function TeleMessagingPanel() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { data: contacts, isLoading } = useTelecallingContacts();
  const recordOutcome = useRecordMessageOutcome();

  const [filter, setFilter] = useState<TeleMessagingFilterId>('pending');
  const [searchQuery, setSearchQuery] = useState('');

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
        notes:
          kind === 'catalog'
            ? 'Catalogue shared on WhatsApp'
            : 'Details sent on WhatsApp',
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
   * One Send → choose details (message) or catalogue (real PDF attach).
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
        text: 'Send catalogue',
        onPress: () => {
          if (!settings.murtiesPdfUri) {
            Alert.alert(
              'Catalog Missing',
              'Upload the Ganesh Murti catalog PDF in Settings, then try again.'
            );
            return;
          }
          void (async () => {
            try {
              const shared = await shareCatalogOnWhatsApp(
                {
                  mobile: contact.mobile,
                  customerName: contact.name,
                },
                settings
              );
              if (shared) {
                await markSent(contact, 'catalog');
              }
            } catch (error) {
              if (!getErrorMessage(error).toLowerCase().includes('cancel')) {
                Alert.alert(
                  'WhatsApp Failed',
                  getErrorMessage(error) || 'Could not share catalogue PDF.'
                );
              }
            }
          })();
        },
      },
    ]);
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
      ? 'Import contacts in Tele-calling first. The same list appears here for WhatsApp messaging.'
      : filter === 'pending'
        ? 'No pending contacts. Everyone here is already in Sent.'
        : 'No sent contacts yet. Send WhatsApp from Pending.';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
          {contactCount === 0
            ? 'Import contacts from Tele-calling first. The same list appears here for WhatsApp messaging.'
            : `${contactCount} contact${contactCount === 1 ? '' : 's'} · Send → details or catalogue · auto-moves to Sent`}
        </Text>
        {contactCount === 0 ? (
          <AppButton
            icon="phone-outgoing"
            variant="tonal"
            compact
            onPress={() => router.push('/(app)/telecalling' as Href)}
            style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}
          >
            Open Tele-calling
          </AppButton>
        ) : null}
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
