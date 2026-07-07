import { useState, useEffect } from 'react';
import { StyleSheet, View, Alert, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useSettingsStore } from '../store/settingsStore';
import { BusinessLogoPicker } from './BusinessLogoPicker';
import { MurtiesPdfPicker } from './MurtiesPdfPicker';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import {
  DEFAULT_ENQUIRY_MESSAGE,
  ENQUIRY_MESSAGE_PLACEHOLDERS,
} from '@/features/enquiries/utils/enquiryWhatsAppMessage';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

export function SettingsForm() {
  const router = useRouter();
  const { businessName, phone, address, mapLink, stallDescription, enquiryMessage, murtiesPdfUri, murtiesPdfName, businessLogo, updateSettings } =
    useSettingsStore();
  const [form, setForm] = useState({
    businessName,
    phone,
    address,
    mapLink: mapLink ?? '',
    stallDescription:
      stallDescription ??
      'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
    enquiryMessage: enquiryMessage ?? DEFAULT_ENQUIRY_MESSAGE,
    murtiesPdfUri: murtiesPdfUri ?? null,
    murtiesPdfName: murtiesPdfName ?? null,
    businessLogo,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      businessName,
      phone,
      address,
      mapLink: mapLink ?? '',
      stallDescription:
        stallDescription ??
        'Eco-friendly Shadu Mati Shree Ganesha Murti stall with various sizes available.',
      enquiryMessage: enquiryMessage ?? DEFAULT_ENQUIRY_MESSAGE,
      murtiesPdfUri: murtiesPdfUri ?? null,
      murtiesPdfName: murtiesPdfName ?? null,
      businessLogo,
    });
  }, [businessName, phone, address, mapLink, stallDescription, enquiryMessage, murtiesPdfUri, murtiesPdfName, businessLogo]);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.formCard, shadows.sm as ViewStyle]}>
      <Text style={styles.sectionTitle}>Business Settings</Text>
      <Text style={styles.description}>
        These details appear on every receipt and printable document.
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
        label="Stall Details (for enquiry messages)"
        value={form.stallDescription}
        onChangeText={(value) =>
          setForm((f) => ({ ...f, stallDescription: value }))
        }
        multiline
      />

      <Text style={styles.subsectionTitle}>Enquiry WhatsApp Message</Text>
      <Text style={styles.fieldHint}>
        This pre-drafted message is sent when you tap Send Details on an enquiry.
        Use placeholders: {ENQUIRY_MESSAGE_PLACEHOLDERS}
      </Text>
      <AppInput
        label="Pre-drafted Enquiry Message"
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

      <MurtiesPdfPicker
        pdfUri={form.murtiesPdfUri}
        pdfName={form.murtiesPdfName}
        onPdfChange={(murtiesPdfUri, murtiesPdfName) => {
          setForm((f) => ({ ...f, murtiesPdfUri, murtiesPdfName }));
          updateSettings({ murtiesPdfUri, murtiesPdfName });
        }}
      />

      <BusinessLogoPicker
        logoUri={form.businessLogo}
        onLogoChange={(businessLogo) => setForm((f) => ({ ...f, businessLogo }))}
      />

      {saved ? <Text style={styles.saved}>Settings saved!</Text> : null}

      <AppButton onPress={handleSave}>Save Settings</AppButton>
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
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.royalRed,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.royalRed,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  fieldHint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  messageInput: {
    minHeight: 220,
  },
  saved: {
    color: colors.success,
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 8,
    fontWeight: '600',
  },
});
