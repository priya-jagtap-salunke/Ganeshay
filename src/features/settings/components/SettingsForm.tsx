import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, ViewStyle } from 'react-native';
import { /* Switch, */ Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '../store/settingsStore';
import { updateVendorSettings } from '@/features/vendor/api/vendorApi';
import { usePortalStore } from '@/stores/portalStore';
import { useVendorStore } from '@/stores/vendorStore';
import { getErrorMessage } from '@/utils/errors';
import { BusinessLogoPicker } from './BusinessLogoPicker';
import { TelecallingBannerPicker } from './TelecallingBannerPicker';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import {
  DEFAULT_ENQUIRY_MESSAGE,
  ENQUIRY_MESSAGE_PLACEHOLDERS,
} from '@/features/telecalling/utils/stallDetailsWhatsAppMessage';
import { DEFAULT_REVIEW_REQUEST_MESSAGE } from '@/features/telemessaging/utils/reviewRequestMessage';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

export function SettingsForm() {
  const router = useRouter();
  const {
    businessName,
    phone,
    address,
    mapLink,
    instagramLink,
    websiteLink,
    stallDescription,
    enquiryMessage,
    reviewRequestMessage,
    telecallingBannerUri,
    murtiesPdfUri,
    murtiesPdfName,
    businessLogo,
    aiEnabled,
    updateSettings,
  } = useSettingsStore();
  const vendorAiEnabled = useVendorStore((s) => s.vendor?.ai_enabled !== false);
  const [form, setForm] = useState({
    businessName,
    phone,
    address,
    mapLink: mapLink ?? '',
    instagramLink: instagramLink ?? 'https://www.instagram.com/bappaji_com',
    websiteLink: websiteLink ?? 'https://bappaji.com/',
    stallDescription:
      stallDescription ??
      'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
    enquiryMessage: enquiryMessage ?? DEFAULT_ENQUIRY_MESSAGE,
    reviewRequestMessage: reviewRequestMessage ?? DEFAULT_REVIEW_REQUEST_MESSAGE,
    telecallingBannerUri: telecallingBannerUri ?? null,
    murtiesPdfUri: murtiesPdfUri ?? null,
    murtiesPdfName: murtiesPdfName ?? null,
    businessLogo,
    aiEnabled: aiEnabled ?? vendorAiEnabled,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const setVendor = useVendorStore((state) => state.setVendor);
  const applyVendorToSettings = useVendorStore((state) => state.applyVendorToSettings);

  useEffect(() => {
    setForm({
      businessName,
      phone,
      address,
      mapLink: mapLink ?? '',
      instagramLink: instagramLink ?? 'https://www.instagram.com/bappaji_com',
      websiteLink: websiteLink ?? 'https://bappaji.com/',
      stallDescription:
        stallDescription ??
        'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
      enquiryMessage: enquiryMessage ?? DEFAULT_ENQUIRY_MESSAGE,
      reviewRequestMessage: reviewRequestMessage ?? DEFAULT_REVIEW_REQUEST_MESSAGE,
      telecallingBannerUri: telecallingBannerUri ?? null,
      murtiesPdfUri: murtiesPdfUri ?? null,
      murtiesPdfName: murtiesPdfName ?? null,
      businessLogo,
      aiEnabled: aiEnabled ?? vendorAiEnabled,
    });
  }, [
    businessName,
    phone,
    address,
    mapLink,
    instagramLink,
    websiteLink,
    stallDescription,
    enquiryMessage,
    reviewRequestMessage,
    telecallingBannerUri,
    murtiesPdfUri,
    murtiesPdfName,
    businessLogo,
    aiEnabled,
    vendorAiEnabled,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      updateSettings(form);
      const vendor = await updateVendorSettings(form);
      setVendor(vendor);
      applyVendorToSettings(vendor);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          usePortalStore.getState().clearPortal();
          await supabase.auth.signOut();
          useVendorStore.getState().clearVendor();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={[styles.formCard, shadows.sm as ViewStyle]}>
      <Text style={styles.sectionTitle}>Business Settings</Text>
      <Text style={styles.description}>
        These details are saved to your stall account and appear on receipts and WhatsApp messages.
      </Text>

      <AppInput
        label="Business Name"
        value={form.businessName}
        onChangeText={(value) => setForm((f) => ({ ...f, businessName: value }))}
      />
      <AppInput
        label="Phone Number"
        value={form.phone}
        onChangeText={(value) => setForm((f) => ({ ...f, phone: value }))}
        keyboardType="phone-pad"
      />
      <AppInput
        label="Business Address"
        value={form.address}
        onChangeText={(value) => setForm((f) => ({ ...f, address: value }))}
        multiline
      />
      <AppInput
        label="Map Pinpoint Link"
        value={form.mapLink}
        onChangeText={(value) => setForm((f) => ({ ...f, mapLink: value }))}
        placeholder="https://maps.google.com/..."
      />
      <AppInput
        label="Instagram Link"
        value={form.instagramLink}
        onChangeText={(value) =>
          setForm((f) => ({ ...f, instagramLink: value }))
        }
        placeholder="https://www.instagram.com/..."
        autoCapitalize="none"
        keyboardType="url"
      />
      <AppInput
        label="Website Link"
        value={form.websiteLink}
        onChangeText={(value) => setForm((f) => ({ ...f, websiteLink: value }))}
        placeholder="https://bappaji.com/"
        autoCapitalize="none"
        keyboardType="url"
      />
      <AppInput
        label="Stall Details (for Tele-calling messages)"
        value={form.stallDescription}
        onChangeText={(value) =>
          setForm((f) => ({ ...f, stallDescription: value }))
        }
        multiline
      />

      <Text style={styles.subsectionTitle}>Tele-calling WhatsApp Message</Text>
      <Text style={styles.fieldHint}>
        This pre-drafted message is sent when you tap Send Details in Tele-calling.
        Use placeholders: {ENQUIRY_MESSAGE_PLACEHOLDERS}
      </Text>
      <AppInput
        label="Pre-drafted Stall Details Message"
        value={form.enquiryMessage}
        onChangeText={(value) =>
          setForm((f) => ({ ...f, enquiryMessage: value }))
        }
        multiline
        style={styles.messageInput}
      />
      <AppButton
        variant="outline"
        onPress={() =>
          setForm((f) => ({ ...f, enquiryMessage: DEFAULT_ENQUIRY_MESSAGE }))
        }
      >
        Reset to Default Message
      </AppButton>

      <Text style={styles.subsectionTitle}>Review & Request Message</Text>
      <Text style={styles.fieldHint}>
        Sent when you tap Review & Request in Tele-Messaging for the selected
        contact.
      </Text>
      <AppInput
        label="Review & Request Message"
        value={form.reviewRequestMessage}
        onChangeText={(value) =>
          setForm((f) => ({ ...f, reviewRequestMessage: value }))
        }
        multiline
        style={styles.messageInput}
      />
      <AppButton
        variant="outline"
        onPress={() =>
          setForm((f) => ({
            ...f,
            reviewRequestMessage: DEFAULT_REVIEW_REQUEST_MESSAGE,
          }))
        }
      >
        Reset to Default Review Message
      </AppButton>

      <TelecallingBannerPicker
        bannerUri={form.telecallingBannerUri}
        onBannerChange={(telecallingBannerUri) => {
          setForm((f) => ({ ...f, telecallingBannerUri }));
          updateSettings({ telecallingBannerUri });
        }}
      />

      <BusinessLogoPicker
        logoUri={form.businessLogo}
        onLogoChange={(businessLogo) => setForm((f) => ({ ...f, businessLogo }))}
      />

      {/* AI Hub temporarily disabled — re-enable by uncommenting below (and set AI_HUB_ENABLED = true) */}
      {/* <Text style={styles.subsectionTitle}>AI Hub</Text>
      <Text style={styles.fieldHint}>
        Free floating hub for Marketing templates and Sales Analyst (from your
        bookings). No paid AI required. Nothing is sent automatically. Not added
        to Bookings or Reports screens.
      </Text>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Enable AI Hub</Text>
        <Switch
          value={form.aiEnabled}
          onValueChange={(next) => setForm((f) => ({ ...f, aiEnabled: next }))}
          color={colors.royalRed}
        />
      </View> */}

      {saved ? <Text style={styles.saved}>Settings saved!</Text> : null}

      <AppButton onPress={handleSave} loading={saving}>
        Save Settings
      </AppButton>

      <AppButton variant="outline" onPress={handleLogout}>
        Logout
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  formCard: {
    padding: spacing.md,
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: colors.royalRed,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.royalRed,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
  },
  messageInput: {
    minHeight: 220,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    minHeight: 48,
  },
  switchLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    paddingRight: spacing.md,
  },
  saved: {
    color: colors.success,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '500',
  },
});
