import { API_BASE_URL, MOBILE_HMAC_SECRET } from '@/constants/config';
import { signRequest } from '@/utils/hmac';

function hmacHeaders(method: string, path: string): Record<string, string> {
  return signRequest(MOBILE_HMAC_SECRET, method, path);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type Tokens = { token: string; refresh_token?: string };

/** POST /api/login_check — exchanges credentials for a JWT + refresh token. */
export async function login(email: string, password: string): Promise<Tokens> {
  const path = '/api/login_check';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...hmacHeaders('POST', path), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    let code = 'login_failed';
    try {
      const body = await res.json();
      if (
        typeof body?.message === 'string' &&
        (body.message.toLowerCase().includes('not verified') ||
          body.message.toLowerCase().includes('pas encore vérifié'))
      ) {
        code = 'account_not_verified';
      }
    } catch {
      // non-JSON body — keep generic code
    }
    throw new ApiError(res.status, code);
  }
  return res.json();
}

/** POST /api/register — creates an account and triggers the verification email. */
export async function register(
  email: string,
  password: string,
  locale: string,
): Promise<void> {
  const path = '/api/register';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...hmacHeaders('POST', path), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, locale }),
  });
  if (!res.ok) {
    let code = 'generic';
    try {
      const body = await res.json();
      if (body?.error) code = String(body.error);
    } catch {
      // non-JSON error response — keep generic
    }
    throw new ApiError(res.status, code);
  }
}

/** POST /api/forgot-password — requests a password-reset email (always 200). */
export async function forgotPassword(email: string): Promise<void> {
  const path = '/api/forgot-password';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...hmacHeaders('POST', path), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'forgot_failed');
  }
}

/** POST /api/token/refresh — renews the JWT from a refresh token. */
export async function refresh(refreshToken: string): Promise<Tokens> {
  const path = '/api/token/refresh';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { ...hmacHeaders('POST', path), 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'refresh_failed');
  }
  return res.json();
}

/**
 * DELETE /api/me — deletes the authenticated account after password confirmation.
 * On success the caller must sign out and clear the local JWT.
 */
export async function deleteMe(token: string, password: string): Promise<void> {
  const path = '/api/me';
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      ...hmacHeaders('DELETE', path),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    let code = 'generic';
    try {
      const body = await res.json();
      if (body?.error) code = String(body.error);
    } catch {
      // ignore
    }
    throw new ApiError(res.status, code);
  }
}

/**
 * Authenticated JSON request against the backend. Throws ApiError on non-2xx
 * (401 in particular signals the caller should refresh or log out).
 */
export async function apiFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...hmacHeaders(method, path),
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new ApiError(res.status, `request_failed_${res.status}`);
  }
  return res.json();
}
