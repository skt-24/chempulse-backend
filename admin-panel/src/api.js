import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://chemsiq-backend.onrender.com/api';
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
  getAll: params => api.get('/admin/articles', { params }).then(payload),
  getBySlug: slug => api.get(`/articles/${encodeURIComponent(slug)}`).then(payload),
  create: body => api.post('/admin/articles', body).then(payload),
  update: (id, body) => api.put(`/admin/articles/${id}`, body).then(payload),
  remove: id => api.delete(`/admin/articles/${id}`).then(payload),
  bulk: body => api.post('/admin/articles/bulk', body).then(payload),
  bulkImport: body => api.post('/admin/articles/bulk', body).then(payload),
  delete: id => api.delete(`/admin/articles/${id}`).then(payload),
  categories: () => api.get('/categories').then(payload),
  topics: () => api.get('/admin/topics').then(payload),
  login: body => api.post('/auth/login', body).then(payload)
};

export const vintageApi = {
  list: params => api.get('/admin/vintage', { params }).then(payload),
  getAll: params => api.get('/admin/vintage', { params }).then(payload),
  getById: id => api.get(`/admin/vintage/${id}`).then(payload),
  create: body => api.post('/admin/vintage', body).then(payload),
  update: (id, body) => api.put(`/admin/vintage/${id}`, body).then(payload),
  remove: id => api.delete(`/admin/vintage/${id}`).then(payload),
  delete: id => api.delete(`/admin/vintage/${id}`).then(payload)
};

export const moleculesApi = {
  list: params => api.get('/admin/molecules', { params }).then(payload),
  getAll: params => api.get('/admin/molecules', { params }).then(payload),
  today: () => api.get('/molecules/today').then(payload),
  getToday: () => api.get('/molecules/today').then(payload),
  create: body => api.post('/admin/molecules', body).then(payload),
  update: (id, body) => api.put(`/admin/molecules/${id}`, body).then(payload),
  remove: id => api.delete(`/admin/molecules/${id}`).then(payload),
  delete: id => api.delete(`/admin/molecules/${id}`).then(payload),
  setFeaturedDate: (id, featuredDate) => api.patch(`/admin/molecules/${id}/featured-date`, { featuredDate }).then(payload)
};

export const ingestionApi = {
  queue: params => api.get('/admin/ingestion/review-queue', { params }).then(payload),
  getQueue: params => api.get('/admin/ingestion/review-queue', { params }).then(payload),
  review: (id, action, canonicalUrl) => api.patch(`/admin/ingestion/review-queue/${id}`, { action, ...(canonicalUrl !== undefined ? { canonicalUrl } : {}) }).then(payload),
  reviewArticle: (id, action, canonicalUrl) => api.patch(`/admin/ingestion/review-queue/${id}`, { action, ...(canonicalUrl !== undefined ? { canonicalUrl } : {}) }).then(payload)
};

export const topicsApi = {
  list: () => api.get('/admin/topics').then(payload),
  create: body => api.post('/admin/topics', body).then(payload),
  update: (id, body) => api.put(`/admin/topics/${id}`, body).then(payload)
};
