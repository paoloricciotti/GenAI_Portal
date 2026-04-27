//const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const API_URL = 'https://genai-portal.onrender.com/api';

const request = async (path, options = {}) => {
  const config = {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  };

  const response = await fetch(`${API_URL}${path}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Errore ${response.status}`);
  }

  return response.json();
};

export const api = {
  auth: {
    login: (credentials) =>
      request('/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),

    me: () => request('/me')
  },

  projects: {
    list: () => request('/projects'),

    getDocs: (id) =>
      request(`/projects/${encodeURIComponent(id)}/documents`),

    uploadDocs: (id, formData) =>
      request(`/projects/${encodeURIComponent(id)}/documents`, {
        method: 'POST',
        body: formData
      }),

    create: (project) =>
      request('/projects', {
        method: 'POST',
        body: JSON.stringify(project)
      }),

    delete: (id) =>
      request(`/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
  },

  users: {
    list: () => request('/users'),

    create: (user) =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(user)
      }),

    delete: (username) =>
      request(`/users/${encodeURIComponent(username)}`, {
        method: 'DELETE'
      }),

    resetPassword: (username, password) =>
      request(`/users/${encodeURIComponent(username)}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password })
      })
  }
};
