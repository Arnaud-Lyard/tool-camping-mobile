import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import * as api from '@/api/client';

const TOKEN_KEY = 'jwt_token';
const REFRESH_KEY = 'jwt_refresh_token';

export type User = {
  id: number;
  email: string;
  roles: string[];
  locale: string;
  isVerified: boolean;
};

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Authenticated request that transparently refreshes the JWT on 401. */
  authedFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  const persist = useCallback(async (tokens: api.Tokens | null) => {
    if (tokens) {
      await SecureStore.setItemAsync(TOKEN_KEY, tokens.token);
      // Refresh tokens are optional (backend may run JWT-only).
      if (tokens.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
      } else {
        await SecureStore.deleteItemAsync(REFRESH_KEY);
      }
      setToken(tokens.token);
      setRefreshToken(tokens.refresh_token ?? null);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      setToken(null);
      setRefreshToken(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await persist(null);
    setUser(null);
    setStatus('unauthenticated');
  }, [persist]);

  // Restore session on app start.
  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!stored) {
        setStatus('unauthenticated');
        return;
      }
      setToken(stored);
      setRefreshToken(storedRefresh);
      try {
        const me = await api.apiFetch<User>('/api/me', stored);
        setUser(me);
        setStatus('authenticated');
      } catch {
        // Token likely expired — try to refresh once, otherwise sign out.
        if (storedRefresh) {
          try {
            const tokens = await api.refresh(storedRefresh);
            await persist(tokens);
            const me = await api.apiFetch<User>('/api/me', tokens.token);
            setUser(me);
            setStatus('authenticated');
            return;
          } catch {
            // fall through to sign out
          }
        }
        await persist(null);
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
  }, [persist]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const tokens = await api.login(email, password);
      await persist(tokens);
      const me = await api.apiFetch<User>('/api/me', tokens.token);
      setUser(me);
      setStatus('authenticated');
    },
    [persist],
  );

  const authedFetch = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      if (!token) throw new api.ApiError(401, 'no_token');
      try {
        return await api.apiFetch<T>(path, token, init);
      } catch (err) {
        if (err instanceof api.ApiError && err.status === 401) {
          if (refreshToken) {
            const tokens = await api.refresh(refreshToken);
            await persist(tokens);
            return api.apiFetch<T>(path, tokens.token, init);
          }
          // Token expired and no refresh available — force re-login.
          await signOut();
        }
        throw err;
      }
    },
    [token, refreshToken, persist, signOut],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, authedFetch }),
    [status, user, signIn, signOut, authedFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
