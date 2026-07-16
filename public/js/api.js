/**
 * public/js/api.js
 * -------------------
 * Shared helpers loaded by every page:
 *  - api()      : fetch wrapper that attaches the JWT and parses JSON
 *  - auth.*     : localStorage helpers for the token + user profile
 *  - toast()    : small toast notification system
 *  - setButtonLoading() : spinner helper for buttons
 *
 * The JWT is stored in localStorage as "rms_token" and the logged-in user's
 * profile (id/name/email/role) as "rms_user". The token is sent on every
 * API call via the Authorization header; the backend is the source of
 * truth for whether it's still valid.
 */

const auth = {
  getToken() {
    return localStorage.getItem('rms_token');
  },
  getUser() {
    const raw = localStorage.getItem('rms_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('rms_token', token);
    localStorage.setItem('rms_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_user');
  },
  isLoggedIn() {
    return Boolean(this.getToken());
  },
};

/**
 * Wraps fetch() to:
 *  - prefix the API base
 *  - attach "Authorization: Bearer <token>" automatically if logged in
 *  - always send/receive JSON
 *  - redirect to login if the server says the token is invalid/expired
 */
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch (_) {
    // no JSON body (rare) - fall through with empty object
  }

  if (response.status === 401 && auth.isLoggedIn()) {
    // Token missing/expired/invalid -> force re-login
    auth.clearSession();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }

  return data;
}

/* ------------------------------- Toasts --------------------------------- */

function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  return stack;
}

/**
 * toast('Request created', 'success')
 * type: 'success' | 'error' | 'info'
 */
function toast(message, type = 'info', duration = 3800) {
  const stack = ensureToastStack();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  el.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'all 0.25s ease';
    setTimeout(() => el.remove(), 250);
  }, duration);
}

/* ---------------------------- Button loading ------------------------------ */

function setButtonLoading(button, isLoading) {
  if (!button) return;
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

/* --------------------------------- Utils ---------------------------------- */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString.replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Redirects away from auth pages if already logged in, to the right dashboard. */
function redirectIfLoggedIn() {
  if (auth.isLoggedIn()) {
    const user = auth.getUser();
    window.location.href = user && user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
  }
}

/** Guards a dashboard page: requires login, and optionally a specific role. */
function requireRole(role) {
  if (!auth.isLoggedIn()) {
    window.location.href = '/login';
    return null;
  }
  const user = auth.getUser();
  if (role && user.role !== role) {
    window.location.href = user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
    return null;
  }
  return user;
}

function logout() {
  auth.clearSession();
  window.location.href = '/login';
}
