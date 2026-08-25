import { useState } from 'react';
import { StyleSheet, View, Image, Alert, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { AppButton } from '@/components/ui/AppButton';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

interface MurtiPhotoPickerProps {
  photoUri: string | null | undefined;
  onPhotoChange: (photoUri: string | null) => void;
}

async function requestLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Please allow photo library access to choose a murti photo.'
    );
    return false;
  }
  return true;
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Please allow camera access to photograph the selected murti.'
    );
    return false;
  }
  return true;
}

export function MurtiPhotoPicker({
  photoUri,
  onPhotoChange,
}: MurtiPhotoPickerProps) {
  const [picking, setPicking] = useState(false);

  const applyAsset = (asset: ImagePicker.ImagePickerAsset) => {
    if (asset.uri) {
      onPhotoChange(asset.uri);
    }
  };

  const handleTakePhoto = async () => {
    const allowed = await requestCameraPermission();
    if (!allowed) return;

    setPicking(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;
      applyAsset(result.assets[0]);
    } catch {
      Alert.alert('Error', 'Could not open the camera. Please try again.');
    } finally {
      setPicking(false);
    }
  };

  const handlePickFromGallery = async () => {
    const allowed = await requestLibraryPermission();
    if (!allowed) return;

    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets[0]) return;
      applyAsset(result.assets[0]);
    } catch {
      Alert.alert('Error', 'Could not select a photo. Please try again.');
    } finally {
      setPicking(false);
    }
  };

  const handleRemove = () => {
    Alert.alert('Remove Photo', 'Remove the murti photo from this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => onPhotoChange(null),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Optional. Capture the selected murti so it can be shared with the
        customer on WhatsApp along with the invoice.
      </Text>

      <View style={styles.previewBox}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No murti photo</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <AppButton
          icon="camera"
          onPress={handleTakePhoto}
          loading={picking}
          variant="outline"
          style={styles.actionButton}
        >
          Take Photo
        </AppButton>
        <AppButton
          icon="image"
          onPress={handlePickFromGallery}
          loading={picking}
          variant="outline"
          style={styles.actionButton}
        >
          Gallery
        </AppButton>
      </View>

      {photoUri ? (
        <AppButton icon="delete" onPress={handleRemove} variant="outline">
          Remove Photo
        </AppButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    height: 220,
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
