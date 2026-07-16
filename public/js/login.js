/**
 * public/js/login.js
 * Handles the User/Admin toggle (purely cosmetic — the backend decides the
 * real role from the account itself) and the login submit flow.
 */

redirectIfLoggedIn();

let selectedRole = 'user';

function setRole(role) {
  selectedRole = role;
  document.getElementById('tab-user').classList.toggle('active', role === 'user');
  document.getElementById('tab-admin').classList.toggle('active', role === 'admin');
  document.getElementById('submit-label').textContent = `Sign in as ${role === 'admin' ? 'Admin' : 'User'}`;
  document.getElementById('forgot-link').classList.toggle('hidden', role === 'admin');
  document.getElementById('register-footer').classList.toggle('hidden', role === 'admin');
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  document.getElementById('email-error').textContent = '';
  document.getElementById('password-error').textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('submit-btn');

  if (!email || !password) {
    if (!email) document.getElementById('email-error').textContent = 'Email is required';
    if (!password) document.getElementById('password-error').textContent = 'Password is required';
    return;
  }

  setButtonLoading(submitBtn, true);
  try {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });

    // Make sure the account's actual role matches the tab they picked,
    // so an admin can't accidentally land on /user-dashboard or vice versa.
    if (selectedRole === 'admin' && data.user.role !== 'admin') {
      toast('This account does not have admin access.', 'error');
      setButtonLoading(submitBtn, false);
      return;
    }

    auth.setSession(data.token, data.user);
    toast('Login successful', 'success');
    setTimeout(() => {
      window.location.href = data.user.role === 'admin' ? '/admin-dashboard' : '/user-dashboard';
    }, 400);
  } catch (err) {
    toast(err.message, 'error');
    setButtonLoading(submitBtn, false);
  }
});
