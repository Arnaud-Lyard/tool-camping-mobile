import { API_BASE_URL } from '@/constants/config';

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
  const res = await fetch(`${API_BASE_URL}/api/login_check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'login_failed');
  }
  return res.json();
}

/** POST /api/register — creates an account and triggers the verification email. */
export async function register(
  email: string,
  password: string,
  locale: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${API_BASE_URL}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'forgot_failed');
  }
}

/** POST /api/token/refresh — renews the JWT from a refresh token. */
export async function refresh(refreshToken: string): Promise<Tokens> {
  const res = await fetch(`${API_BASE_URL}/api/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'refresh_failed');
  }
  return res.json();
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
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
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
