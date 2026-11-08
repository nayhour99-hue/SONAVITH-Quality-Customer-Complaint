// helper to include Authorization header if token stored
function authHeader() {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Login & Auth
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
  try {
    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    localStorage.setItem('is_admin', payload.is_admin ? '1' : '0');
    localStorage.setItem('user_role', payload.role || 'Sale');
  } catch (e) { /* ignore decode errors */ }
  if (data.permissions) {
    localStorage.setItem('user_permissions', JSON.stringify(data.permissions));
  }
  return data;
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_email');
  localStorage.removeItem('is_admin');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_permissions');
}

// User and Role Management API helpers
export async function getAllUsers() {
  const res = await fetch('/api/users', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function createUser(userData) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create user');
  }
  return res.json();
}

export async function updateUserAccess(userId, payload) {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/access`, {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update user access');
  }
  return res.json();
}

export async function deleteUser(userId) {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete user');
  }
  return res.json();
}

export async function updateUserPermissions(userId, permissions) {
  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/permissions`, {
    method: 'PUT',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(permissions),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update stage permissions');
  }
  return res.json();
}

// Metrics & Complaints
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

export async function downloadComplaintsExcel(params = {}) {
  const url = getExportExcelUrl(params);
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to export Excel report');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  
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
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch complaint');
  return res.json();
}

export async function createComplaint(data) {
  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
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
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit QA review');
  return res.json();
}

export async function submitCEODecision(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/ceo`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit CEO decision');
  return res.json();
}

export async function submitWarehouseFulfill(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/warehouse`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit warehouse fulfillment');
  return res.json();
}

export async function submitStockReturn(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/stock-return`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to submit stock return control');
  return res.json();
}

export async function submitStockReturnSignOff(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/stock-return/sign-off`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit QA sign-off for stock return');
  }
  return res.json();
}

export async function submitDisposalAction(id, data) {
  const res = await fetch(`/api/complaints/${encodeURIComponent(id)}/disposal`, {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit disposal action');
  }
  return res.json();
}

export async function submitBatchDisposalAction(data) {
  const res = await fetch('/api/complaints/batch-disposal', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to submit batch disposal action');
  }
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
  const res = await fetch('/api/reset-data', { 
    method: 'POST',
    headers: authHeader()
  });
  if (!res.ok) throw new Error('Failed to reset data');
  return res.json();
}

export async function getCustomers() {
  const res = await fetch('/api/customers', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function addCustomer(data) {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add customer');
  return res.json();
}

export async function addCustomersBulk(data) {
  const res = await fetch('/api/customers/bulk', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to bulk add customers');
  return res.json();
}

export async function getProducts() {
  const res = await fetch('/api/products', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function addProduct(data) {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add product');
  return res.json();
}

export async function addProductsBulk(data) {
  const res = await fetch('/api/products/bulk', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to bulk add products');
  return res.json();
}

// Defect Types API
export async function getDefectTypes() {
  const res = await fetch('/api/defect-types', { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to fetch defect types');
  return res.json();
}

export async function addDefectType(data) {
  const res = await fetch('/api/defect-types', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to add defect type');
  }
  return res.json();
}

export async function addDefectTypesBulk(data) {
  const res = await fetch('/api/defect-types/bulk', {
    method: 'POST',
    headers: { ...authHeader(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to bulk add defect types');
  return res.json();
}

export async function deleteDefectType(defectId) {
  const res = await fetch(`/api/defect-types/${encodeURIComponent(defectId)}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete defect type');
  return res.json();
}
