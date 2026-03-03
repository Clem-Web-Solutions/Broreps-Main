const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export interface SaasUser {
  id: number;
  email: string;
  name: string;
  subscription_status: 'active' | 'past_due' | 'cancelled' | 'expired';
  subscription_product?: string;
  modules_unlocked: number;
  next_billing_at?: string;
  subscribed_at?: string;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('saas_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers as Record<string, string> || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err: Error & { code?: string; status?: number } = new Error(
      data.error || `HTTP ${res.status}`
    );
    err.code = data.code;
    err.status = res.status;
    throw err;
  }

  return data as T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: SaasUser }>('/api/saas/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    request<{ user: SaasUser }>('/api/saas/auth/me'),

  forgotPassword: (email: string) =>
    request<{ success: boolean }>('/api/saas/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  setupPassword: (token: string, password: string) =>
    request<{ token: string; user: SaasUser }>('/api/saas/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// ─── Modules ───────────────────────────────────────────────────────────────────
export interface ModuleProgress {
  id: number;
  unlocked: boolean;
  watched_seconds: number;
  total_seconds: number;
  completed: boolean;
  progress_pct: number;
}

export const modulesApi = {
  list: () =>
    request<{ modules: ModuleProgress[]; modules_unlocked: number }>('/api/saas/modules'),

  saveProgress: (id: number, watched_seconds: number, total_seconds: number) =>
    request<{ success: boolean; completed: boolean }>(`/api/saas/modules/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify({ watched_seconds, total_seconds }),
    }),
};

// ─── Forum ─────────────────────────────────────────────────────────────────────
export interface ForumMessage {
  id: number;
  content: string;
  created_at: string;
  author_name: string;
  author_id: number;
}

export const forumApi = {
  list: (category: string) =>
    request<{ messages: ForumMessage[]; total: number }>(`/api/saas/forum/${category}`),

  post: (category: string, content: string) =>
    request<{ message: ForumMessage }>(`/api/saas/forum/${category}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  delete: (id: number) =>
    request<{ success: boolean }>(`/api/saas/forum/message/${id}`, { method: 'DELETE' }),
};

// ─── Hub ───────────────────────────────────────────────────────────────────────
export interface HubPost {
  id: number;
  content: string;
  post_type: 'recent' | 'collab';
  likes_count: number;
  created_at: string;
  author_name: string;
  author_id: number;
  liked_by_me: boolean;
}

export const hubApi = {
  list: (filter?: string) =>
    request<{ posts: HubPost[] }>(`/api/saas/hub${filter ? `?filter=${filter}` : ''}`),

  post: (content: string, post_type?: string) =>
    request<{ post: HubPost }>('/api/saas/hub', {
      method: 'POST',
      body: JSON.stringify({ content, post_type }),
    }),

  like: (id: number) =>
    request<{ liked: boolean; likes_count: number }>(`/api/saas/hub/${id}/like`, { method: 'POST' }),

  delete: (id: number) =>
    request<{ success: boolean }>(`/api/saas/hub/${id}`, { method: 'DELETE' }),
};

// ─── Notes ─────────────────────────────────────────────────────────────────────
export const notesApi = {
  get: () =>
    request<{ scores: Record<string, number>; reflection: string }>('/api/saas/notes'),

  save: (scores: Record<string, number>, reflection: string) =>
    request<{ success: boolean }>('/api/saas/notes', {
      method: 'PUT',
      body: JSON.stringify({ scores, reflection }),
    }),
};
