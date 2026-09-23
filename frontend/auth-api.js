// ==========================================
// EDUVIA API CLIENT & AUTH HELPER (Vanilla JS)
// ==========================================
const API_BASE_URL = window.location.origin.includes(':5000') 
  ? window.location.origin 
  : 'http://localhost:5000';

/**
 * Universal API Fetch Interceptor:
 * - Automatically injects Authorization: Bearer <token>
 * - Sets Content-Type: application/json for non-FormData payloads
 * - Intercepts 401 Unauthorized responses
 */
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('eduvia_token');
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do not set Content-Type if sending FormData (browser sets boundary automatically)
  const isFormData = (typeof FormData !== 'undefined' && options.body instanceof FormData) ||
                     (options.body && options.body.constructor && options.body.constructor.name === 'FormData');

  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    console.warn('[apiFetch] Session expired or unauthorized (401). Clearing token.');
    localStorage.removeItem('eduvia_token');
    localStorage.removeItem('eduvia_user_id');
  }

  return response;
}

/**
 * Login fetch request saving JWT and user ID to localStorage
 */
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    // Persist JWT and user identifier to localStorage
    localStorage.setItem('eduvia_token', data.token);
    if (data.user_id) {
      localStorage.setItem('eduvia_user_id', data.user_id);
    }

    console.log('[Auth] Logged in successfully. Token stored in localStorage.');
    return data;
  } catch (error) {
    console.error('[Auth] Login error:', error);
    throw error;
  }
}

/**
 * Logout and clear stored session
 */
function logoutUser() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('eduvia_token');
    localStorage.removeItem('eduvia_user_id');
  }
  console.log('[Auth] User logged out.');
}

/**
 * Retrieve active JWT token from localStorage
 */
function getAuthToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('eduvia_token') : null;
}

/**
 * Check if a session token exists
 */
function isAuthenticated() {
  return Boolean(getAuthToken());
}

/**
 * Modular DOM listener for Login forms (does not require altering HTML markup)
 */
function initLoginFormListener(customSelector = '#login-form', callbacks = {}) {
  if (typeof document === 'undefined') return;

  const form = document.querySelector(customSelector) || document.querySelector('form[data-auth="login"]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = form.querySelector('#login-email') || form.querySelector('input[name="email"]') || form.querySelector('input[type="email"]');
    const passwordInput = form.querySelector('#login-password') || form.querySelector('input[name="password"]') || form.querySelector('input[type="password"]');
    const submitBtn = form.querySelector('#login-submit') || form.querySelector('button[type="submit"]');
    const errorEl = form.querySelector('#login-error') || form.querySelector('.auth-error-message');

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (errorEl) errorEl.textContent = '';
    if (submitBtn) submitBtn.disabled = true;

    try {
      const data = await loginUser(email, password);
      if (typeof callbacks.onSuccess === 'function') {
        callbacks.onSuccess(data);
      }
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Login failed';
      }
      if (typeof callbacks.onError === 'function') {
        callbacks.onError(err);
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// Expose on window object if in browser environment
if (typeof window !== 'undefined') {
  window.apiFetch = apiFetch;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.getAuthToken = getAuthToken;
  window.isAuthenticated = isAuthenticated;
  window.initLoginFormListener = initLoginFormListener;

  // Auto-bind login listener if DOM is ready or on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initLoginFormListener());
    } else {
      initLoginFormListener();
    }
  }
}

