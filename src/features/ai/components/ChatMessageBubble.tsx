import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AppCard } from '@/components/ui/AppCard';
import { AppButton } from '@/components/ui/AppButton';
import { LocalChatMessage } from '../hooks/useAiChat';
import { useSettingsStore } from '@/features/settings/store/settingsStore';
import {
  copyTextToClipboard,
  generatePosterPdf,
  sharePosterPdf,
  shareTextViaWhatsApp,
} from '../services/posterService';
import { getErrorMessage } from '@/utils/errors';
import { radius, spacing } from '@/theme/spacing';

interface ChatMessageBubbleProps {
  message: LocalChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';
  const [posterBusy, setPosterBusy] = useState(false);
  const businessName = useSettingsStore((s) => s.businessName);
  const phone = useSettingsStore((s) => s.phone);
  const address = useSettingsStore((s) => s.address);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(message.content);
      Alert.alert('Copied', 'Message copied. Paste it wherever you need.');
    } catch (err) {
      Alert.alert('Copy failed', getErrorMessage(err));
    }
  };

  const handleWhatsApp = async () => {
    try {
      await shareTextViaWhatsApp(message.content);
    } catch (err) {
      Alert.alert('WhatsApp', getErrorMessage(err));
    }
  };

  const handlePoster = async () => {
    if (!message.poster) return;
    setPosterBusy(true);
    try {
      const uri = await generatePosterPdf(message.poster, {
        businessName,
        phone,
        address,
      });
      await sharePosterPdf(uri);
    } catch (err) {
      Alert.alert('Poster', getErrorMessage(err));
    } finally {
      setPosterBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
      ]}
    >
      <AppCard
        elevationLevel={1}
        style={[
          styles.bubble,
          {
            backgroundColor: isUser
              ? theme.colors.primaryContainer
              : theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isUser
                ? theme.colors.onPrimaryContainer
                : theme.colors.onSurface,
            },
          ]}
          selectable
        >
          {message.content || (message.streaming ? '…' : '')}
        </Text>

        {!isUser && message.content && !message.streaming ? (
          <View style={styles.actions}>
            <AppButton variant="text" compact onPress={handleCopy}>
              Copy
            </AppButton>
            <AppButton variant="text" compact onPress={handleWhatsApp}>
              WhatsApp
            </AppButton>
            {message.poster ? (
              <AppButton
                variant="saffron"
                compact
                loading={posterBusy}
                onPress={handlePoster}
              >
                Poster PDF
              </AppButton>
            ) : null}
          </View>
        ) : null}
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '92%',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.sm,
  },
});
