import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AppInput } from '@/components/ui/AppInput';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { SuggestedQuestions } from './SuggestedQuestions';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ConversationList } from './ConversationList';
import { useAiChat } from '../hooks/useAiChat';
import {
  useAiConversations,
  useAiMessages,
  useDeleteAiConversation,
} from '../hooks/useAiConversations';
import { fetchAiMessages } from '../api/aiApi';
import { SuggestedPromptCategory } from '../types';
import { spacing } from '@/theme/spacing';

const INTRO: Record<
  SuggestedPromptCategory,
  {
    icon: 'bullhorn-outline' | 'chart-timeline-variant' | 'help-circle-outline';
    message: string;
  }
> = {
  marketing: {
    icon: 'bullhorn-outline',
    message:
      'Draft WhatsApp, Marathi, Instagram, festival greetings, or posters. Never auto-sends.',
  },
  sales: {
    icon: 'chart-timeline-variant',
    message:
      'Sales metrics from your bookings. Free hub does not use ChatGPT.',
  },
  help: {
    icon: 'help-circle-outline',
    message: 'Tips for the free AI Hub.',
  },
};

interface AiModeChatProps {
  category: SuggestedPromptCategory;
  composerLabel: string;
  pendingPrompt?: string | null;
  onPendingConsumed?: () => void;
  showHistoryActions?: boolean;
  /** Extra header above suggested prompts (e.g. Sales Analyst cards) */
  listHeaderExtra?: ReactNode;
  hideEmptyIntro?: boolean;
}

export function AiModeChat({
  category,
  composerLabel,
  pendingPrompt,
  onPendingConsumed,
  showHistoryActions = true,
  listHeaderExtra,
  hideEmptyIntro = false,
}: AiModeChatProps) {
  const theme = useTheme();
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const listRef = useRef<FlatList>(null);

  const chat = useAiChat(null);
  const conversationsQuery = useAiConversations();
  const messagesQuery = useAiMessages(chat.conversationId);
  const deleteMutation = useDeleteAiConversation();

  useEffect(() => {
    if (
      chat.conversationId &&
      messagesQuery.data &&
      !chat.isStreaming &&
      chat.messages.length === 0
    ) {
      chat.loadFromServer(chat.conversationId, messagesQuery.data);
    }
  }, [
    chat.conversationId,
    messagesQuery.data,
    chat.isStreaming,
    chat.messages.length,
    chat.loadFromServer,
  ]);

  useEffect(() => {
    if (chat.messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [chat.messages]);

  useEffect(() => {
    if (!pendingPrompt?.trim() || chat.isStreaming) return;
    const prompt = pendingPrompt.trim();
    onPendingConsumed?.();
    void chat.sendMessage(prompt);
  }, [pendingPrompt, chat.isStreaming, chat.sendMessage, onPendingConsumed]);

  const handleSend = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput('');
    await chat.sendMessage(value);
  };

  const handleSelectConversation = async (id: string) => {
    chat.resetChat();
    const rows = await fetchAiMessages(id);
    chat.loadFromServer(id, rows);
    setShowHistory(false);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        if (chat.conversationId === id) chat.resetChat();
      },
      onError: (err) => Alert.alert('Error', String(err.message ?? err)),
    });
  };

  const intro = INTRO[category];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      {showHistoryActions ? (
        <View style={styles.toolbar}>
          <AppButton
            variant="text"
            compact
            icon="history"
            onPress={() => setShowHistory((v) => !v)}
          >
            History
          </AppButton>
          <AppButton
            variant="text"
            compact
            icon="plus"
            onPress={() => chat.resetChat()}
          >
            New chat
          </AppButton>
        </View>
      ) : null}

      {showHistory ? (
        <View style={styles.history}>
          <Text style={[styles.historyTitle, { color: theme.colors.onSurface }]}>
            Chat history
          </Text>
          <ConversationList
            conversations={conversationsQuery.data ?? []}
            selectedId={chat.conversationId}
            onSelect={handleSelectConversation}
            onDelete={handleDelete}
            isLoading={conversationsQuery.isLoading}
          />
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        style={styles.flex}
        data={chat.messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        ListHeaderComponent={
          <View>
            {listHeaderExtra}
            {!hideEmptyIntro && chat.messages.length === 0 ? (
              <EmptyState compact icon={intro.icon} message={intro.message} />
            ) : null}
            <SuggestedQuestions
              category={category}
              disabled={chat.isStreaming}
              onSelect={(prompt) => handleSend(prompt)}
            />
          </View>
        }
        renderItem={({ item }) => <ChatMessageBubble message={item} />}
      />

      {chat.error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {chat.error}
        </Text>
      ) : null}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: theme.colors.outlineVariant,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <AppInput
          label={composerLabel}
          value={input}
          onChangeText={setInput}
          multiline
          style={styles.input}
          disabled={chat.isStreaming}
          onSubmitEditing={() => handleSend()}
        />
        <AppButton
          onPress={() => handleSend()}
          loading={chat.isStreaming}
          disabled={!input.trim() || chat.isStreaming}
          icon="send"
        >
          Send
        </AppButton>
      </View>

      <LoadingOverlay
        visible={Boolean(
          messagesQuery.isFetching &&
            chat.messages.length === 0 &&
            chat.conversationId
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  messages: {
    paddingVertical: spacing.sm,
    paddingBottom: spacing.lg,
  },
  history: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.xs,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  composer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  input: {
    maxHeight: 120,
  },
  error: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: 13,
  },
});
