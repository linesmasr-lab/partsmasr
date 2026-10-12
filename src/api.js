async function request(path, { method = 'GET', body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `http_${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  config: () => request('/api/config'),
  tree: () => request('/api/tree'),
  categories: () => request('/api/categories'),
  vehicle: (id) => request(`/api/vehicles/${id}`),
  parts: (id, cat) => request(`/api/vehicles/${id}/parts${cat ? `?cat=${encodeURIComponent(cat)}` : ''}`),
  search: (q, vehicle) => request(`/api/search?q=${encodeURIComponent(q)}${vehicle ? `&vehicle=${vehicle}` : ''}`),
  order: (body) => request('/api/orders', { method: 'POST', body }),
  admin: {
    login: (password) => request('/api/admin/login', { method: 'POST', body: { password } }),
    parts: (token, q = '') => request(`/api/admin/parts?q=${encodeURIComponent(q)}`, { token }),
    part: (token, id) => request(`/api/admin/parts/${id}`, { token }),
    savePart: (token, id, body) => request(id ? `/api/admin/parts/${id}` : '/api/admin/parts', { method: id ? 'PUT' : 'POST', body, token }),
    deletePart: (token, id) => request(`/api/admin/parts/${id}`, { method: 'DELETE', token }),
    upload: (token, file) => { const f = new FormData(); f.append('image', file); return request('/api/admin/upload', { method: 'POST', form: f, token }); },
    orders: (token) => request('/api/admin/orders', { token }),
    setStatus: (token, id, status) => request(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status }, token }),
  },
};

export const money = (n) => `${Number(n).toLocaleString('ar-EG')} ج.م`;
export const TIER = { oem: 'أصلي', premium: 'بديل ممتاز', economy: 'اقتصادي' };
export const STOCK = { in: 'متوفر', '24h': 'خلال 24 ساعة', out: 'غير متوفر' };
export const vehicleLabel = (v) => (v ? `${v.make} ${v.model} ${v.year} · ${v.engine}` : '');
