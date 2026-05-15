import api from './axios';

export const authApi = {
  login: (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  me: () => api.get('/auth/me'),
};

export const dashboardApi = {
  getSummary: (params) => api.get('/dashboard', { params }),
};

export const entriesApi = {
  getAll: (params) => api.get('/entries', { params }),
  getOne: (id) => api.get(`/entries/${id}`),
  create: (d) => api.post('/entries', d),
  update: (id, d) => api.put(`/entries/${id}`, d),
  delete: (id) => api.delete(`/entries/${id}`),
  /** Creates a blank ROI row for today if none exists (after login / daily). */
  ensureToday: () => api.post('/entries/ensure-today'),
};

export const staffApi = {
  getAll: () => api.get('/staff'),
  getSalarySummary: () => api.get('/staff/salary-summary'),
  getSettlementsForDay: (date) => api.get('/staff/settlements-for-day', { params: { date } }),
  create: (d) => api.post('/staff', d),
  update: (id, d) => api.put(`/staff/${id}`, d),
  delete: (id) => api.delete(`/staff/${id}`),
  addSettlement:    (id, d)       => api.post(`/staff/${id}/settle`, d),
  updateSettlement: (id, sid, d)  => api.put(`/staff/${id}/settlements/${sid}`, d),
  deleteSettlement: (id, sid)     => api.delete(`/staff/${id}/settlements/${sid}`),
  resetSettlements: (id)          => api.post(`/staff/${id}/reset-settlements`),
};

export const stockApi = {
  getAll: (params) => api.get('/stock', { params }),
  getMonthTotals: () => api.get('/stock/month-totals'),
  getToday: () => api.get('/stock/today'),
  save: (d) => api.post('/stock', d),
  delete: (id) => api.delete(`/stock/${id}`),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  update: (id, d) => api.put(`/users/${id}`, d),
  resetPassword: (id, d) => api.put(`/users/${id}/reset-password`, d),
  delete: (id) => api.delete(`/users/${id}`),
};

export const requestsApi = {
  getAll: (params) => api.get('/requests', { params }),
  create: (d) => api.post('/requests', d),
  update: (id, d) => api.put(`/requests/${id}`, d),
  delete: (id) => api.delete(`/requests/${id}`),
};
