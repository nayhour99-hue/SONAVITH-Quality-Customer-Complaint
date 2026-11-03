export async function getMetrics({ timeFilter, dateMode, sortBy, order, refDate } = {}) {
  const params = new URLSearchParams();
  if (timeFilter && timeFilter !== 'All time') params.append('time_filter', timeFilter);
  if (dateMode) params.append('date_mode', dateMode);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (refDate) params.append('ref_date', refDate);

  const res = await fetch(`/api/metrics?${params.toString()}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

// helper to include Authorization header if token stored
function authHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getComplaints({ status, search, timeFilter, dateMode, date, expiryDate, sortBy, order, refDate } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (timeFilter && timeFilter !== 'All time') params.append('time_filter', timeFilter);
  if (dateMode) params.append('date_mode', dateMode);
  if (date) params.append('date', date);
  if (expiryDate) params.append('expiry_date', expiryDate);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (refDate) params.append('ref_date', refDate);

  const res = await fetch(`/api/complaints?${params.toString()}`, {
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export function getExportExcelUrl({ status, search, timeFilter, dateMode, date, expiryDate, sortBy, order, refDate } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (timeFilter && timeFilter !== 'All time') params.append('time_filter', timeFilter);
  if (dateMode) params.append('date_mode', dateMode);
  if (date) params.append('date', date);
  if (expiryDate) params.append('expiry_date', expiryDate);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (refDate) params.append('ref_date', refDate);
  return `/api/complaints/export-excel?${params.toString()}`;
}

// login helper
export async function login(email, password) {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_email', email);
  // Decode JWT payload to store admin flag
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    localStorage.setItem('is_admin', payload.is_admin ? '1' : '0');
  } catch (e) { /* ignore decode errors */ }
  return data;
}

  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user_email', email);
  return data;
}

export async function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_email');
}

// stage assignment API helpers
export async function getStageAssignments(stage) {
  const res = await fetch(`/api/stage/${stage}/assignments`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch stage assignments');
  return res.json();
}

export async function assignUserToStage(stage, userId, assign) {
  const res = await fetch(`/api/stage/${stage}/assign`, {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, assign }),
  });
  if (!res.ok) throw new Error('Failed to assign user to stage');
  return res.json();
}

export async function getAllUsers() {
  const res = await fetch('/api/users', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function setUserRole(userId, payload) {
  // payload: { isAdmin: boolean, role: string }
  const body = {
    is_admin: payload.isAdmin ? 1 : 0,
    role: payload.role || ''
  };
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/role`, {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to set user role');
  return res.json();
}

  localStorage.removeItem('access_token');
  localStorage.removeItem('user_email');
}

// other functions unchanged but now include authHeader where appropriate


export async function getComplaints({ status, search, timeFilter, dateMode, date, expiryDate, sortBy, order, refDate } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (timeFilter && timeFilter !== 'All time') params.append('time_filter', timeFilter);
  if (dateMode) params.append('date_mode', dateMode);
  if (date) params.append('date', date);
  if (expiryDate) params.append('expiry_date', expiryDate);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (refDate) params.append('ref_date', refDate);

  const res = await fetch(`/api/complaints?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch complaints');
  return res.json();
}

export function getExportExcelUrl({ status, search, timeFilter, dateMode, date, expiryDate, sortBy, order, refDate } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'All') params.append('status', status);
  if (search) params.append('search', search);
  if (timeFilter && timeFilter !== 'All time') params.append('time_filter', timeFilter);
  if (dateMode) params.append('date_mode', dateMode);
  if (date) params.append('date', date);
  if (expiryDate) params.append('expiry_date', expiryDate);
  if (sortBy) params.append('sort_by', sortBy);
  if (order) params.append('order', order);
  if (refDate) params.append('ref_date', refDate);
  return `/api/complaints/export-excel?${params.toString()}`;
}

// logout helper
export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_email');
}

  const url = getExportExcelUrl(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to export Excel report');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  
  // Extract filename from response header if available
  const disposition = res.headers.get('Content-Disposition') || '';
  let filename = 'SONAVITH_Defective_Product_Reports.xlsx';
  const match = disposition.match(/filename="?([^"]+)"?/);
  if (match && match[1]) {
    filename = match[1];
  }
  
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
  return filename;
}

export async function getComplaintById(id) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Failed to fetch complaint');
  return res.json();
}

export async function createComplaint(data) {
  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit complaint');
  }
  return res.json();
}

export async function submitQAReview(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit QA review');
  return res.json();
}

export async function submitCEODecision(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/ceo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit CEO decision');
  return res.json();
}

export async function submitWarehouseFulfill(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/warehouse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit warehouse fulfillment');
  return res.json();
}

export async function uploadPhoto(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload photo');
  return res.json();
}

export async function resetData() {
  const res = await fetch('/api/reset-data', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset data');
  return res.json();
}

export async function getCustomers() {
  const res = await fetch('/api/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function addCustomer(data) {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add customer');
  return res.json();
}

export async function addCustomersBulk(data) {
  const res = await fetch('/api/customers/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to bulk add customers');
  return res.json();
}

export async function getProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function addProduct(data) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add product');
  return res.json();
}

export async function addProductsBulk(data) {
  const res = await fetch('/api/products/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to bulk add products');
  return res.json();
}
