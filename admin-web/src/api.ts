const API_BASE = '';
const TOKEN_KEY = 'buildmart_admin_token';

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `API ${res.status} for ${path}`);
  }
  return json as T;
}

export async function apiLogin(userId: string, password: string) {
  const res = await request<{
    token: string;
    user: { id: string; role: string; fullName?: string };
  }>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId, password }),
  });
  setAdminToken(res.token);
  return res;
}

export const apiGet = <T>(path: string) => request<T>(path);

export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

export async function apiUploadImage(file: File): Promise<{ url: string }> {
  const body = new FormData();
  body.append('image', file);
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/api/v1/admin/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: { message?: string };
  };
  if (!res.ok || !json.url) {
    throw new Error(json.error?.message ?? 'Image upload failed');
  }
  return { url: json.url };
}
