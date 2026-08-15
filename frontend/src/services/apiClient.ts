import AsyncStorage from '@react-native-async-storage/async-storage';
import { env } from '../config/env';

const TOKEN_KEY = '@buildmart/access_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

type RequestOpts = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
  token?: string | null;
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (opts.auth !== false) {
    const token = opts.token ?? (await getAccessToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${env.apiBaseUrl.replace(/\/$/, '')}${path}`, {
    method: opts.method ?? (opts.body ? 'POST' : 'GET'),
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });

  const json = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  } & T;

  if (!res.ok) {
    throw new ApiError(
      json.error?.code ?? 'HTTP_ERROR',
      json.error?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }

  return json as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOpts, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),
  getAccessToken,
  setAccessToken,
};
