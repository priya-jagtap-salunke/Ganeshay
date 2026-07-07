import { useState } from 'react';
import { StyleSheet, FlatList, Alert, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/layout/ScreenContainer';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EnquiryCard } from '@/features/enquiries/components/EnquiryCard';
import { CallLogPicker } from '@/features/enquiries/components/CallLogPicker';
import {
  useCreateEnquiry,
  useDeleteEnquiry,
  useEnquiries,
  useUpdateEnquiryStatus,
} from '@/features/enquiries/hooks/useEnquiries';
import { shareEnquiryOnWhatsApp } from '@/features/enquiries/services/enquiryWhatsAppService';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export default function EnquiriesScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const { data: enquiries, isLoading } = useEnquiries();
  const createEnquiry = useCreateEnquiry();
  const deleteEnquiry = useDeleteEnquiry();
  const updateStatus = useUpdateEnquiryStatus();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleAddEnquiry = async (entry: {
    mobile: string;
    customer_name: string | null;
    call_date: string | null;
  }) => {
    try {
      await createEnquiry.mutateAsync({
        mobile: entry.mobile,
        customer_name: entry.customer_name,
        source: entry.call_date ? 'call_log' : 'manual',
        call_date: entry.call_date,
      });
      setPickerVisible(false);
      Alert.alert('Added', 'Enquiry added successfully.');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleSendDetails = async (enquiryId: string) => {
    const enquiry = enquiries?.find((item) => item.id === enquiryId);
    if (!enquiry) return;

    setSendingId(enquiryId);
    try {
      await shareEnquiryOnWhatsApp(enquiry, settings);
      if (enquiry.status === 'open') {
        await updateStatus.mutateAsync({ id: enquiry.id, status: 'contacted' });
      }
    } catch (err) {
      Alert.alert('WhatsApp Error', getErrorMessage(err));
    } finally {
      setSendingId(null);
    }
  };

  const handleDelete = (id: string, mobile: string) => {
    Alert.alert('Delete Enquiry', `Remove enquiry for ${mobile}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteEnquiry.mutate(id, {
            onError: (err) => Alert.alert('Error', getErrorMessage(err)),
          });
        },
      },
    ]);
  };

  return (
    <ScreenContainer
      title="Enquiries"
      onBack={() => router.replace('/(app)/dashboard')}
    >
      <LoadingOverlay visible={isLoading && !enquiries} />

      <View style={styles.headerBlock}>
        <Text style={styles.description}>
          Add callers from your phone log, then send stall location and details on
          WhatsApp with one tap.
        </Text>
        <AppButton icon="phone-plus" onPress={() => setPickerVisible(true)}>
          Add Enquiry
        </AppButton>
      </View>

      <FlatList
        data={enquiries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <EnquiryCard
            enquiry={item}
            index={index}
            sending={sendingId === item.id}
            onSendDetails={() => handleSendDetails(item.id)}
            onDelete={() => handleDelete(item.id, item.mobile)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="phone-in-talk"
              message="No enquiries yet. Tap Add Enquiry to pick a recent call."
            />
          ) : null
        }
      />

      <CallLogPicker
        visible={pickerVisible}
        onDismiss={() => setPickerVisible(false)}
        onSelect={handleAddEnquiry}
        isSaving={createEnquiry.isPending}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
});
