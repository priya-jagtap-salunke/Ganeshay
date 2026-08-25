import { supabase } from '@/lib/supabase';
import { getPasswordResetRedirectUrl } from '@/features/auth/utils/passwordResetRedirect';

/** Request a password-recovery email. Always treat as success for privacy. */
export async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Please enter your login email');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: getPasswordResetRedirectUrl(),
  });

  // Supabase usually returns success even when the email is unknown.
  // Still surface real config/network failures.
  if (error) {
    throw error;
  }
}

export async function updatePassword(password: string): Promise<void> {
  const trimmed = password.trim();
  if (trimmed.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const { error } = await supabase.auth.updateUser({ password: trimmed });
  if (error) {
    throw error;
  }
}

/**
 * Consume tokens/code from a Supabase auth redirect (recovery or other).
 * Supports PKCE (`?code=`) and implicit (`#access_token&type=recovery`) links.
 */
export async function consumeAuthCallbackUrl(
  url: string
): Promise<'recovery' | 'session' | null> {
  if (!url) return null;

  const params = extractAuthParams(url);
  if (!params) return null;

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    // Caller should also listen for PASSWORD_RECOVERY; treat as recovery when type says so.
    return params.get('type') === 'recovery' ? 'recovery' : 'session';
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return params.get('type') === 'recovery' ? 'recovery' : 'session';
  }

  return null;
}

function extractAuthParams(url: string): URLSearchParams | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0 && hashIndex < url.length - 1) {
    const hash = url.slice(hashIndex + 1);
    if (hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('type=')) {
      return new URLSearchParams(hash);
    }
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0 && queryIndex < url.length - 1) {
    const query = url.slice(queryIndex + 1).split('#')[0];
    if (
      query.includes('code=') ||
      query.includes('access_token') ||
      query.includes('refresh_token') ||
      query.includes('type=')
    ) {
      return new URLSearchParams(query);
    }
  }

  return null;
}
