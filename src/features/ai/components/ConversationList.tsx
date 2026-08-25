import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AiConversation } from '../types';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, radius, touchTarget } from '@/theme/spacing';

interface ConversationListProps {
  conversations: AiConversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onDelete,
  isLoading,
}: ConversationListProps) {
  const theme = useTheme();

  if (!isLoading && conversations.length === 0) {
    return (
      <EmptyState
        compact
        message="No chat history yet. Ask a business or marketing question to start."
        icon="chat-outline"
      />
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            onPress={() => onSelect(item.id)}
            onLongPress={() => {
              Alert.alert('Delete chat', `Delete “${item.title}”?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => onDelete(item.id),
                },
              ]);
            }}
            style={({ pressed }) => [
              styles.item,
              {
                backgroundColor: selected
                  ? theme.colors.secondaryContainer
                  : theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="message-text-outline"
              size={20}
              color={theme.colors.primary}
            />
            <View style={styles.itemText}>
              <Text
                numberOfLines={1}
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}
              >
                {new Date(item.updated_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 160,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: touchTarget.min,
  },
  itemText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
});
