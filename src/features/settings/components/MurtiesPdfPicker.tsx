import { useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { AppButton } from '@/components/ui/AppButton';
import {
  persistMurtiesPdf,
  removeMurtiesPdf,
} from '../utils/murtiesPdfStorage';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { getErrorMessage } from '@/utils/errors';

interface MurtiesPdfPickerProps {
  pdfUri: string | null;
  pdfName: string | null;
  onPdfChange: (pdfUri: string | null, pdfName: string | null) => void;
}

export function MurtiesPdfPicker({
  pdfUri,
  pdfName,
  onPdfChange,
}: MurtiesPdfPickerProps) {
  const [picking, setPicking] = useState(false);

  const handlePickPdf = async () => {
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert('Error', 'Could not read the selected PDF.');
        return;
      }

      if (asset.size && asset.size > 15 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please choose a PDF under 15 MB.');
        return;
      }

      await removeMurtiesPdf(pdfUri);
      const saved = await persistMurtiesPdf(
        asset.uri,
        asset.name || 'Ganesha_Murties_Catalog.pdf'
      );
      onPdfChange(saved.uri, saved.name);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setPicking(false);
    }
  };

  const handleRemovePdf = () => {
    Alert.alert(
      'Remove PDF',
      'Remove the Ganesha murties catalog PDF from Tele-calling messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMurtiesPdf(pdfUri);
              onPdfChange(null, null);
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
      <Text style={styles.label}>Ganesha Murties Catalog (PDF)</Text>
      <Text style={styles.hint}>
        This PDF is attached with your Tele-calling WhatsApp message when you tap
        Send Details.
      </Text>

      <View style={styles.previewBox}>
        {pdfUri ? (
          <View style={styles.fileRow}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={42}
              color={colors.royalRed}
            />
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>
                {pdfName || 'Ganesha_Murties_Catalog.pdf'}
              </Text>
              <Text style={styles.fileMeta}>Ready to send on WhatsApp</Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons
              name="file-upload-outline"
              size={40}
              color={colors.gray}
            />
            <Text style={styles.placeholderText}>No PDF uploaded</Text>
          </View>
        )}
      </View>

      <AppButton
        icon="file-upload"
        onPress={handlePickPdf}
        loading={picking}
        variant="outline"
      >
        {pdfUri ? 'Change PDF' : 'Upload Murties PDF'}
      </AppButton>

      {pdfUri ? (
        <AppButton icon="delete" onPress={handleRemovePdf} variant="outline">
          Remove PDF
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
    padding: spacing.md,
    minHeight: 110,
    justifyContent: 'center',
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  fileMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  placeholderText: {
    fontSize: 16,
    color: colors.gray,
  },
});
