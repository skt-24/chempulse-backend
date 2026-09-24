import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
export const api = axios.create({ baseURL, timeout: 30000 });
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('chemsiq_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
let refreshRequest;
api.interceptors.response.use(r => r, async error => {
  const request = error.config;
  if (error.response?.status === 401 && request && !request._retried && !/\/auth\/(login|refresh)$/.test(request.url || '')) {
    const refreshToken = sessionStorage.getItem('chemsiq_admin_refresh_token');
    if (refreshToken) {
      request._retried = true;
      try {
        refreshRequest ||= axios.post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 20000 })
          .then(response => response.data?.data)
          .finally(() => { refreshRequest = undefined; });
        const tokens = await refreshRequest;
        if (!tokens?.accessToken) throw new Error('Session refresh failed.');
        sessionStorage.setItem('chemsiq_admin_token', tokens.accessToken);
        if (tokens.refreshToken) sessionStorage.setItem('chemsiq_admin_refresh_token', tokens.refreshToken);
        request.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(request);
      } catch {
        // Fall through to the regular session cleanup.
      }
    }
  }
  if ([401, 403].includes(error.response?.status)) {
    sessionStorage.removeItem('chemsiq_admin_token');
    sessionStorage.removeItem('chemsiq_admin_refresh_token');
    window.dispatchEvent(new Event('admin:unauthorized'));
  }
  return Promise.reject(error);
});
export const payload = response => response.data?.data;
export const articlesApi = {
  list: params => api.get('/admin/articles', { params }).then(payload),
  create: body => api.post('/admin/articles', body).then(payload),
  update: (id, body) => api.put(`/admin/articles/${id}`, body).then(payload),
  remove: id => api.delete(`/admin/articles/${id}`).then(payload),
  bulk: body => api.post('/admin/articles/bulk', body).then(payload),
  categories: () => api.get('/categories').then(payload),
  topics: () => api.get('/admin/topics').then(payload),
  login: body => api.post('/auth/login', body).then(payload)
};
