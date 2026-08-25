import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteAiConversation,
  fetchAiConversations,
  fetchAiMessages,
} from '../api/aiApi';

export function useAiConversations() {
  return useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: fetchAiConversations,
  });
}

export function useAiMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['ai', 'messages', conversationId],
    queryFn: () => fetchAiMessages(conversationId!),
    enabled: Boolean(conversationId),
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAiConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}
