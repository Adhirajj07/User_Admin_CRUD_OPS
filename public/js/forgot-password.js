redirectIfLoggedIn();

document.getElementById('forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('email-error').textContent = '';

  const email = document.getElementById('email').value.trim();
  const submitBtn = document.getElementById('submit-btn');

  if (!email) {
    document.getElementById('email-error').textContent = 'Email is required';
    return;
  }

  setButtonLoading(submitBtn, true);
  try {
    // The backend always returns the same generic success message,
    // whether or not the email is registered, to avoid leaking which
    // emails exist in the system.
    await api('/auth/forgot-password', { method: 'POST', body: { email } });
    document.getElementById('form-view').classList.add('hidden');
    document.getElementById('success-view').classList.remove('hidden');
  } catch (err) {
    toast(err.message, 'error');
    setButtonLoading(submitBtn, false);
  }
});
