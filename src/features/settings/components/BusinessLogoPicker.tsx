import { useState } from 'react';
import { StyleSheet, View, Image, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { shadows } from '@/theme/shadows';
import { radius, spacing } from '@/theme/spacing';

interface BusinessLogoPickerProps {
  logoUri: string | null;
  onLogoChange: (logoUri: string | null) => void;
}

async function uriToBase64(uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Please allow photo access to select your business logo.'
    );
    return false;
  }
  return true;
}

export function BusinessLogoPicker({
  logoUri,
  onLogoChange,
}: BusinessLogoPickerProps) {
  const [picking, setPicking] = useState(false);

  const handlePickLogo = async () => {
    const allowed = await requestPermission();
    if (!allowed) return;

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.mimeType ?? 'image/jpeg';
        onLogoChange(`data:${mime};base64,${asset.base64}`);
      } else if (asset.uri) {
        const dataUri = await uriToBase64(asset.uri);
        onLogoChange(dataUri);
      }
    } catch {
      Alert.alert('Error', 'Could not select logo. Please try again.');
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert('Remove Logo', 'Remove the business logo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => onLogoChange(null) },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Business Logo</Text>
      <Text style={styles.hint}>
        Used on PDF receipts, invoices, and printable documents.
      </Text>

      <View style={styles.previewBox}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No logo selected</Text>
          </View>
        )}
      </View>

      <AppButton icon="image" onPress={handlePickLogo} loading={picking} variant="outline">
        {logoUri ? 'Change Logo' : 'Select Logo from Device'}
      </AppButton>

      {logoUri ? (
        <AppButton icon="delete" onPress={handleRemoveLogo} variant="outline">
          Remove Logo
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.royalRed,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 12,
  },
  previewBox: {
    backgroundColor: colors.warmIvory,
    borderWidth: 2,
    borderColor: colors.goldLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    marginBottom: 8,
  },
  preview: {
    width: 200,
    height: 120,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.gray,
  },
});
