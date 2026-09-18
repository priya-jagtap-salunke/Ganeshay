import { useMemo, useState } from 'react';
import { StyleSheet, FlatList, Alert, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Text } from 'react-native-paper';
import { useRouter, type Href } from 'expo-router';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import {
  useImportTelecallingContacts,
  useTelecallingContacts,
} from '@/features/telecalling/hooks/useTelecallingContacts';
import { normalizeMobile } from '@/features/telecalling/utils/phoneNormalize';
import { getErrorMessage } from '@/utils/errors';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import {
  ContactImportPreviewRow,
  isImportablePreviewRow,
} from '../types';
import { parseContactsExcelForPreview } from '../utils/parseContactsExcelForPreview';
import { downloadSampleContactsExcel } from '../utils/sampleContactsExcel';
import { ImportPreviewRow } from './ImportPreviewRow';

const EXCEL_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export function ImportContactsPanel() {
  const router = useRouter();
  const { data: contacts } = useTelecallingContacts();
  const importMutation = useImportTelecallingContacts();

  const [previewRows, setPreviewRows] = useState<ContactImportPreviewRow[] | null>(
    null
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const existingMobiles = useMemo(() => {
    const set = new Set<string>();
    for (const contact of contacts ?? []) {
      const mobile = normalizeMobile(contact.mobile);
      if (mobile) set.add(mobile);
    }
    return set;
  }, [contacts]);

  const summary = useMemo(() => {
    if (!previewRows) return null;
    const valid = previewRows.filter(isImportablePreviewRow).length;
    const invalid = previewRows.length - valid;
    return { total: previewRows.length, valid, invalid };
  }, [previewRows]);

  const handleDownloadSample = async () => {
    setBusy(true);
    try {
      await downloadSampleContactsExcel();
    } catch (err) {
      Alert.alert('Download failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePickExcel = async () => {
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...EXCEL_MIME_TYPES, '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const asset = result.assets[0];
      const name = asset.name ?? 'contacts.xlsx';
      const lower = name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
        Alert.alert(
          'Unsupported file',
          'Please choose an Excel file (.xlsx or .xls).'
        );
        return;
      }

      const parsed = await parseContactsExcelForPreview(
        asset.uri,
        name,
        existingMobiles
      );
      setPreviewRows(parsed.rows);
      setFileName(parsed.fileName);
    } catch (err) {
      Alert.alert('Could not read Excel', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClearPreview = () => {
    setPreviewRows(null);
    setFileName(null);
  };

  const handleImport = async () => {
    if (!previewRows?.length) return;

    const toImport = previewRows.filter(isImportablePreviewRow).map((row) => ({
      name: row.name.trim(),
      mobile: row.mobile,
    }));

    if (!toImport.length) {
      Alert.alert(
        'Nothing to import',
        'Fix validation errors or remove duplicates before importing.'
      );
      return;
    }

    setBusy(true);
    try {
      const { inserted, skippedExisting } =
        await importMutation.mutateAsync(toImport);

      Alert.alert(
        'Import complete',
        `Added ${inserted.length} contact${inserted.length === 1 ? '' : 's'}.` +
          (skippedExisting
            ? ` Skipped ${skippedExisting} already in your list.`
            : ''),
        [
          {
            text: 'Open Tele-Messaging',
            onPress: () => router.replace('/(app)/telemessaging' as Href),
          },
          { text: 'Done', style: 'cancel', onPress: handleClearPreview },
        ]
      );
      handleClearPreview();
    } catch (err) {
      Alert.alert('Import failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const loading = busy || importMutation.isPending;

  return (
    <View style={styles.root}>
      <LoadingOverlay visible={loading} />

      <Text variant="bodyMedium" style={styles.intro}>
        Upload an Excel file with Name and Mobile Number columns. Preview and
        validate contacts before importing into Tele-Messaging and Tele-calling.
      </Text>

      <View style={styles.actions}>
        <AppButton
          icon="download"
          variant="tonal"
          onPress={handleDownloadSample}
          disabled={loading}
          style={styles.actionBtn}
        >
          Download Sample Excel
        </AppButton>
        <AppButton
          icon="file-upload-outline"
          onPress={handlePickExcel}
          disabled={loading}
          style={styles.actionBtn}
        >
          Upload Excel
        </AppButton>
      </View>

      {previewRows && summary ? (
        <>
          <View style={styles.summaryBox}>
            <Text variant="titleSmall" style={styles.summaryTitle}>
              Preview — {fileName}
            </Text>
            <Text variant="bodySmall" style={styles.summaryText}>
              {summary.total} row{summary.total === 1 ? '' : 's'} ·{' '}
              {summary.valid} valid · {summary.invalid} with issues
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              Valid rows need a name and a 10-digit mobile starting with 6–9.
            </Text>
          </View>

          <View style={styles.previewActions}>
            <AppButton
              icon="check"
              onPress={handleImport}
              disabled={loading || summary.valid === 0}
              style={styles.flexBtn}
            >
              Import {summary.valid} contact{summary.valid === 1 ? '' : 's'}
            </AppButton>
            <AppButton
              icon="close"
              variant="outline"
              onPress={handleClearPreview}
              disabled={loading}
              style={styles.flexBtn}
            >
              Clear
            </AppButton>
          </View>

          <FlatList
            data={previewRows}
            keyExtractor={(item) => `${item.rowNumber}-${item.mobileRaw}`}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <ImportPreviewRow row={item} />}
          />
        </>
      ) : (
        <EmptyState
          icon="file-excel-outline"
          message="Download the sample Excel, fill in contacts, then upload to preview before importing."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  intro: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionBtn: {
    alignSelf: 'stretch',
  },
  summaryBox: {
    backgroundColor: colors.warmIvory,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grayLight,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  summaryText: {
    color: colors.textSecondary,
  },
  hint: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flexBtn: {
    flex: 1,
  },
  list: {
    paddingBottom: spacing.xl,
  },
});
