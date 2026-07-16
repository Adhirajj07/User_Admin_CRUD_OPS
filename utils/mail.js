/**
 * utils/mail.js
 * ---------------
 * Real Nodemailer integration for the "forgot password" flow.
 *
 * In production, set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env and the
 * app sends through your real provider (Gmail, SendGrid, Mailtrap, etc).
 *
 * In development, if SMTP_USER is left blank, the app automatically creates
 * a free Ethereal (https://ethereal.email) test inbox on startup and prints
 * a "preview URL" to the console for every email -- so the reset-password
 * flow is fully testable with zero email setup.
 */

const nodemailer = require('nodemailer');

let transporterPromise = null;

function buildTransporter() {
  const hasRealCreds = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (hasRealCreds) {
    return Promise.resolve(
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    );
  }

  // No real SMTP creds configured -> spin up a disposable Ethereal test account
  return nodemailer.createTestAccount().then((testAccount) => {
    console.log('No SMTP credentials found in .env - using a temporary Ethereal test inbox.');
    console.log('Every email sent will print a preview link in this console.');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  });
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter();
  }
  return transporterPromise;
}

/**
 * Sends the password reset email containing the reset link.
 *
 * Deliberately never throws: if the SMTP/Ethereal network call fails (e.g. no
 * internet access, wrong credentials, provider downtime), the reset TOKEN has
 * already been saved to the database by the caller, so we log the link to the
 * console as a fallback instead of breaking the "forgot password" request for
 * the user. This keeps the feature usable/testable even when outbound email
 * is unavailable, while still doing a real Nodemailer send whenever it can.
 */
async function sendResetPasswordEmail(toEmail, resetToken) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const resetLink = `${clientUrl}/reset-password/${resetToken}`;

  // Always visible, regardless of whether the email transport works.
  console.log(`Password reset link for ${toEmail}: ${resetLink}`);

  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM || '"Request Management System" <no-reply@example.com>',
      to: toEmail,
      subject: 'Reset your password',
      html: `
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
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Password reset email preview (Ethereal): ${previewUrl}`);
    }

    return info;
  } catch (err) {
    console.warn('Could not send reset email (continuing anyway, link is logged above):', err.message);
    return null;
  }
}

module.exports = { sendResetPasswordEmail };
