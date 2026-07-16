/**
 * public/js/register.js
 * Client-side validation for good UX -- the backend re-validates everything
 * regardless, since client checks can always be bypassed.
 */

redirectIfLoggedIn();

function clearErrors() {
  ['name', 'email', 'password', 'confirm-password'].forEach((id) => {
    const el = document.getElementById(`${id}-error`);
    if (el) el.textContent = '';
  });
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const submitBtn = document.getElementById('submit-btn');

  let hasError = false;
  if (!name) {
    document.getElementById('name-error').textContent = 'Full name is required';
    hasError = true;
  }
  if (!email) {
    document.getElementById('email-error').textContent = 'Email is required';
    hasError = true;
  }
  if (password.length < 8) {
    document.getElementById('password-error').textContent = 'Password must be at least 8 characters';
    hasError = true;
  }
  if (confirmPassword !== password) {
    document.getElementById('confirm-password-error').textContent = 'Passwords do not match';
    hasError = true;
  }
  if (hasError) return;

  setButtonLoading(submitBtn, true);
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: { name, email, password, confirmPassword },
    });
    auth.setSession(data.token, data.user);
    toast('Account created!', 'success');
    setTimeout(() => (window.location.href = '/user-dashboard'), 500);
  } catch (err) {
    toast(err.message, 'error');
    setButtonLoading(submitBtn, false);
  }
});
