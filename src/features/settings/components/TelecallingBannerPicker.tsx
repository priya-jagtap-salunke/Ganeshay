import { useState } from 'react';
import { StyleSheet, View, Image, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { AppButton } from '@/components/ui/AppButton';
import {
  persistTelecallingBanner,
  removeTelecallingBanner,
} from '../utils/telecallingBannerStorage';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

interface TelecallingBannerPickerProps {
  bannerUri: string | null;
  onBannerChange: (bannerUri: string | null) => void;
}

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Please allow photo access to upload a Tele-calling banner image.'
    );
    return false;
  }
  return true;
}

export function TelecallingBannerPicker({
  bannerUri,
  onBannerChange,
}: TelecallingBannerPickerProps) {
  const [picking, setPicking] = useState(false);

  const handlePickBanner = async () => {
    const allowed = await requestPermission();
    if (!allowed) return;

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      await removeTelecallingBanner(bannerUri);
      const savedUri = await persistTelecallingBanner(result.assets[0].uri);
      onBannerChange(savedUri);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setPicking(false);
    }
  };

  const handleRemoveBanner = () => {
    Alert.alert(
      'Remove Banner',
      'Remove the Tele-calling banner image from Send Details?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTelecallingBanner(bannerUri);
              onBannerChange(null);
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tele-calling Banner Image</Text>
      <Text style={styles.hint}>
        This image is attached with your pre-drafted message when you tap Send in
        Tele-calling. Use a wide banner (16:9 works best).
      </Text>

      <View style={styles.previewBox}>
        {bannerUri ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.preview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No banner uploaded</Text>
          </View>
        )}
      </View>

      <AppButton
        icon="image-area"
        onPress={handlePickBanner}
        loading={picking}
        variant="outline"
      >
        {bannerUri ? 'Change Banner' : 'Upload Banner Image'}
      </AppButton>

      {bannerUri ? (
        <AppButton icon="delete" onPress={handleRemoveBanner} variant="outline">
          Remove Banner
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
    lineHeight: 20,
  },
  previewBox: {
    backgroundColor: colors.warmIvory,
    borderWidth: 2,
    borderColor: colors.goldLight,
    borderRadius: radius.lg,
    overflow: 'hidden',
    minHeight: 140,
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    height: 160,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.gray,
  },
});
