import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { getErrorMessage, getSupabaseConfigError } from '@/utils/errors';
import { POSTER_MARKER_RE } from '../constants';
import {
  AiConversation,
  AiMessage,
  AiStreamEvent,
  PosterBrief,
} from '../types';

function mapAiError(error: unknown): Error {
  return new Error(getErrorMessage(error));
}

export function stripPosterMarker(content: string): string {
  return content.replace(POSTER_MARKER_RE, '').trim();
}

export function extractPosterBrief(content: string): PosterBrief | null {
  const match = content.match(POSTER_MARKER_RE);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as PosterBrief;
  } catch {
    return null;
  }
}

export async function fetchAiConversations(): Promise<AiConversation[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) throw mapAiError(error);
  return (data ?? []) as AiConversation[];
}

export async function fetchAiMessages(
  conversationId: string
): Promise<AiMessage[]> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const { data, error } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw mapAiError(error);
  return (data ?? []) as AiMessage[];
}

export async function deleteAiConversation(
  conversationId: string
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId);
  if (error) throw mapAiError(error);
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be signed in to use the AI Assistant.');
  }
  return session.access_token;
}

function getFunctionsBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  if (!url) throw new Error('Supabase URL is not configured.');
  return `${url.replace(/\/$/, '')}/functions/v1`;
}

function parseNdjsonChunk(
  buffer: string,
  onEvent: (event: AiStreamEvent) => void
): string {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  for (const line of parts) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      onEvent(JSON.parse(trimmed) as AiStreamEvent);
    } catch {
      // ignore malformed line
    }
  }
  return rest;
}

/**
 * LLM streaming via Edge Function — NOT used by the free AI Hub.
 * Free mode uses Marketing templates + Sales Analyst RPC only.
 * Kept gated so accidental calls fail clearly without requiring OPENAI_API_KEY.
 */
export async function streamAiChat(_params: {
  message: string;
  conversationId?: string | null;
  onEvent: (event: AiStreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  throw new Error(
    'Free AI Hub does not use ChatGPT. Open Marketing templates or Sales Analyst from the hub home instead.'
  );
}

/** @deprecated Free hub does not call the Edge Function. Retained for reference only. */
export async function streamAiChatLegacy(params: {
  message: string;
  conversationId?: string | null;
  onEvent: (event: AiStreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  const token = await getAccessToken();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const endpoint = `${getFunctionsBaseUrl()}/ai-assistant`;
  const body = JSON.stringify({
    message: params.message,
    conversationId: params.conversationId ?? null,
  });

  // Prefer fetch + ReadableStream (web / newer RN)
  if (typeof ReadableStream !== 'undefined' && Platform.OS === 'web') {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body,
      signal: params.signal,
    });

    if (!res.ok) {
      let errMsg = `AI request failed (${res.status})`;
      try {
        const json = await res.json();
        if (json?.error) errMsg = String(json.error);
      } catch {
        // ignore
      }
      throw new Error(errMsg);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      parseNdjsonChunk(`${text}\n`, params.onEvent);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseNdjsonChunk(buffer, params.onEvent);
    }
    if (buffer.trim()) parseNdjsonChunk(`${buffer}\n`, params.onEvent);
    return;
  }

  // Native: XHR with progressive responseText
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastIndex = 0;
    let buffer = '';
    let settled = false;

    const fail = (err: Error) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const succeed = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    if (params.signal) {
      const onAbort = () => {
        xhr.abort();
        fail(new Error('Request cancelled'));
      };
      if (params.signal.aborted) {
        onAbort();
        return;
      }
      params.signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.open('POST', endpoint);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('apikey', anonKey);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.responseType = 'text';

    xhr.onprogress = () => {
      const text = xhr.responseText ?? '';
      const chunk = text.slice(lastIndex);
      lastIndex = text.length;
      if (!chunk) return;
      buffer += chunk;
      buffer = parseNdjsonChunk(buffer, params.onEvent);
    };

    xhr.onload = () => {
      const text = xhr.responseText ?? '';
      const chunk = text.slice(lastIndex);
      if (chunk) {
        buffer += chunk;
        buffer = parseNdjsonChunk(buffer, params.onEvent);
      }
      if (buffer.trim()) parseNdjsonChunk(`${buffer}\n`, params.onEvent);

      if (xhr.status >= 200 && xhr.status < 300) {
        succeed();
        return;
      }

      try {
        const json = JSON.parse(text);
        fail(new Error(String(json?.error ?? `AI request failed (${xhr.status})`)));
      } catch {
        fail(new Error(`AI request failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => fail(new Error('Network error talking to AI Assistant.'));
    xhr.send(body);
  });
}
