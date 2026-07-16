/**
 * utils/mail.js
 * ---------------
 * Sends the password-reset email via Brevo's HTTP email API
 * (https://api.brevo.com/v3/smtp/email).
 *
 * We use an HTTP API instead of raw SMTP because many PaaS hosts (Render's
 * free tier included) block outbound traffic on SMTP ports 25/465/587.
 * HTTP APIs go over normal HTTPS, so they aren't affected.
 *
 * Required env vars:
 *   BREVO_API_KEY   - from https://app.brevo.com/settings/keys/api
 *   MAIL_FROM_EMAIL - sender address (must be a verified sender in Brevo)
 *   MAIL_FROM_NAME  - optional display name, defaults below
 *
 * If BREVO_API_KEY is not set, sending is skipped and only the console log
 * fallback runs, so local dev still works with zero setup.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Sends the password reset email containing the reset link.
 *
 * Deliberately never throws: if the API call fails (bad key, network issue,
 * provider downtime), the reset TOKEN has already been saved to the database
 * by the caller, so we log the link to the console as a fallback instead of
 * breaking the "forgot password" request for the user.
 */
async function sendResetPasswordEmail(toEmail, resetToken) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const resetLink = `${clientUrl}/reset-password/${resetToken}`;

  // Always visible, regardless of whether the email actually sends.
  console.log(`Password reset link for ${toEmail}: ${resetLink}`);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log('BREVO_API_KEY not set - skipping email send, link is logged above.');
    return null;
  }

  const fromEmail = process.env.MAIL_FROM_EMAIL || 'no-reply@example.com';
  const fromName = process.env.MAIL_FROM_NAME || 'Request Management System';

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: toEmail }],
        subject: 'Reset your password',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}"
                 style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                Reset Password
              </a>
            </p>
            <p>Or copy this link into your browser:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Brevo API responded ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    console.log(`Password reset email sent via Brevo (messageId: ${data.messageId}).`);
    return data;
  } catch (err) {
    console.warn('Could not send reset email (continuing anyway, link is logged above):', err.message);
    return null;
  }
}

module.exports = { sendResetPasswordEmail };