type ErrorLike = {
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  code?: unknown;
};

function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isErrorLike(error)) {
    const parts: string[] = [];

    if (typeof error.message === 'string' && error.message.trim()) {
      parts.push(error.message.trim());
    }

    if (typeof error.details === 'string' && error.details.trim()) {
      parts.push(error.details.trim());
    }

    if (typeof error.hint === 'string' && error.hint.trim()) {
      parts.push(error.hint.trim());
    }

    if (parts.length > 0) {
      return parts.join(' ');
    }
  }

  return 'An unexpected error occurred';
}

export function getSupabaseConfigError(): string | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !key || url.includes('your-project')) {
    return 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then rebuild the app.';
  }

  return null;
}
