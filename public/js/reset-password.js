redirectIfLoggedIn();

// The token is the last path segment: /reset-password/<token>
const resetToken = window.location.pathname.split('/').filter(Boolean).pop();

document.getElementById('reset-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('password-error').textContent = '';
  document.getElementById('confirm-password-error').textContent = '';

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const submitBtn = document.getElementById('submit-btn');

  let hasError = false;
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
    await api(`/auth/reset-password/${resetToken}`, {
      method: 'POST',
      body: { password, confirmPassword },
    });
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('success-view').classList.remove('hidden');
  } catch (err) {
    toast(err.message, 'error');
    setButtonLoading(submitBtn, false);
  }
});
