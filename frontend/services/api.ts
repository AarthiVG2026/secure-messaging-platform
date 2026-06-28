const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface RequestOptions extends RequestInit {
  useAuth?: boolean;
}

// Global fetch wrapper with JWT interceptor
async function request(path: string, options: RequestOptions = {}) {
  const { useAuth = true, headers = {}, ...rest } = options;
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const authHeaders: Record<string, string> = {};
  if (useAuth && token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Set Content-Type default if body is JSON
  if (rest.body && !(rest.body instanceof FormData)) {
    authHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    headers: {
      ...authHeaders,
      ...headers,
    },
    ...rest,
  };

  let response = await fetch(`${API_BASE_URL}${path}`, config);

  // If unauthorized, attempt to refresh token
  if (response.status === 401 && useAuth && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          localStorage.setItem('access_token', refreshData.access_token);
          localStorage.setItem('refresh_token', refreshData.refresh_token);

          // Retry the original request
          (config.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshData.access_token}`;
          response = await fetch(`${API_BASE_URL}${path}`, config);
        } else {
          // Refresh token expired or invalid, log out user
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('current_user');
          if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
            window.location.href = '/login';
          }
        }
      } catch (e) {
        console.error('Error refreshing token:', e);
      }
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (body: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(body), useAuth: false }),
  login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body), useAuth: false }),
  logout: (refreshToken: string) => request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }), useAuth: false }),
  getMe: () => request('/auth/me'),

  // Contacts
  getContacts: () => request('/contacts'),
  addContact: (identifier: string, nickname?: string) => request('/contacts', { method: 'POST', body: JSON.stringify({ identifier, nickname }) }),
  importDemoContacts: () => request('/contacts/demo-import', { method: 'POST' }),
  deleteContact: (id: string) => request(`/contacts/${id}`, { method: 'DELETE' }),
  blockContact: (contactUserId: string, isBlocked: boolean) => request('/contacts/block', { method: 'POST', body: JSON.stringify({ contact_user_id: contactUserId, is_blocked: isBlocked }) }),

  // Conversations & DMs
  getConversations: () => request('/conversations'),
  startConversation: (recipientId: string) => request('/conversations', { method: 'POST', body: JSON.stringify({ recipient_id: recipientId }) }),
  getMessages: (conversationId: string, limit = 100, offset = 0) => request(`/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`),
  setDisappearingMessages: (conversationId: string, seconds: number | null) => request(`/conversations/${conversationId}/disappearing-messages`, { method: 'PUT', body: JSON.stringify({ disappearing_seconds: seconds }) }),

  // Groups
  createGroup: (body: { name: string; description?: string; avatar_url?: string; member_ids: string[] }) => request('/groups', { method: 'POST', body: JSON.stringify(body) }),
  updateGroup: (id: string, body: any) => request(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  addGroupMember: (convId: string, userId: string) => request(`/groups/${convId}/members/${userId}`, { method: 'POST' }),
  removeGroupMember: (convId: string, userId: string) => request(`/groups/${convId}/members/${userId}`, { method: 'DELETE' }),
  deleteGroup: (convId: string) => request(`/groups/${convId}`, { method: 'DELETE' }),
  promoteAdmin: (convId: string, userId: string) => request(`/groups/${convId}/members/${userId}/promote`, { method: 'PUT' }),
  demoteAdmin: (convId: string, userId: string) => request(`/groups/${convId}/members/${userId}/demote`, { method: 'PUT' }),

  // Users profile search
  updateProfile: (body: { display_name?: string; bio?: string; avatar_url?: string }) => request('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  searchUsers: (query: string) => request(`/users/search?q=${encodeURIComponent(query)}`),
  getAllUsers: () => request('/users/all'),

  // File uploads
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/messages/upload', {
      method: 'POST',
      body: formData,
      // Pass a custom header configuration since we don't want JSON default content-type
      headers: {},
    });
  },

  // Message Reactions
  reactToMessage: (messageId: string, emoji: string) => request(`/messages/${messageId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
};
export { API_BASE_URL };
