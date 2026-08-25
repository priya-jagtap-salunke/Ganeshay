import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  extractPosterBrief,
  streamAiChat,
  stripPosterMarker,
} from '../api/aiApi';
import { PosterBrief } from '../types';
import { getErrorMessage } from '@/utils/errors';

export type LocalChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  poster?: PosterBrief | null;
  streaming?: boolean;
};

export function useAiChat(initialConversationId: string | null = null) {
  const queryClient = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId
  );
  const [messages, setMessages] = useState<LocalChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestPosterRef = useRef<PosterBrief | null>(null);

  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setConversationId(null);
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    latestPosterRef.current = null;
  }, []);

  const loadFromServer = useCallback(
    (id: string, serverMessages: { id: string; role: string; content: string }[]) => {
      setConversationId(id);
      setMessages(
        serverMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => {
            const poster =
              m.role === 'assistant' ? extractPosterBrief(m.content) : null;
            return {
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: stripPosterMarker(m.content),
              poster,
            };
          })
      );
      setError(null);
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      latestPosterRef.current = null;

      const userId = `local-user-${Date.now()}`;
      const assistantId = `local-assistant-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', content: trimmed },
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          streaming: true,
          poster: null,
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamAiChat({
          message: trimmed,
          conversationId,
          signal: controller.signal,
          onEvent: (event) => {
            if (event.type === 'meta') {
              setConversationId(event.conversationId);
              return;
            }
            if (event.type === 'delta') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + event.content }
                    : m
                )
              );
              return;
            }
            if (event.type === 'poster') {
              latestPosterRef.current = event.payload;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, poster: event.payload }
                    : m
                )
              );
              return;
            }
            if (event.type === 'error') {
              setError(event.error);
              return;
            }
            if (event.type === 'done') {
              setConversationId(event.conversationId);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        id: event.messageId,
                        streaming: false,
                        content: stripPosterMarker(m.content),
                        poster: m.poster ?? latestPosterRef.current,
                      }
                    : m
                )
              );
            }
          },
        });

        queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
        if (conversationId) {
          queryClient.invalidateQueries({
            queryKey: ['ai', 'messages', conversationId],
          });
        }
      } catch (err) {
        const message = getErrorMessage(err);
        if (message !== 'Request cancelled') {
          setError(message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    streaming: false,
                    content:
                      m.content ||
                      'Sorry — I could not complete that reply. Please try again.',
                  }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming, queryClient]
  );

  return {
    conversationId,
    messages,
    isStreaming,
    error,
    setError,
    sendMessage,
    resetChat,
    loadFromServer,
    setMessages,
  };
}
