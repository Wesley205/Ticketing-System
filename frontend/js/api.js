const API_BASE = '/api';

function getToken() { return localStorage.getItem('nsc_token'); }
function getUser() {
  const raw = localStorage.getItem('nsc_user');
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem('nsc_token', token);
  localStorage.setItem('nsc_user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('nsc_token');
  localStorage.removeItem('nsc_user');
}

async function api(path, { method = 'GET', body, isCsv = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/index.html';
    throw new Error('Session expired');
  }

  if (isCsv) {
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

function requireAuthPage() {
  if (!getToken()) {
    window.location.href = '/index.html';
  }
}

function requireRolePage(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    window.location.href = '/dashboard.html';
  }
}

function logout() {
  clearSession();
  window.location.href = '/index.html';
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function statusClass(s) { return 'status-' + String(s).replace(/\s+/g, '-'); }
