/**
 * controllers/authController.js
 * Handles registration, login, and the full forgot/reset-password flow.
 */
const crypto = require('crypto');
const { hashPassword, comparePassword } = require('../utils/hash');
const { signToken } = require('../utils/jwt');
const { sendResetPasswordEmail } = require('../utils/mail');
const userModel = require('../models/userModel');
const resetModel = require('../models/passwordResetModel');

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body;

  const existing = await userModel.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const hashedPassword = await hashPassword(password);
  const userId = await userModel.createUser({ name, email, hashedPassword, role: 'user' });

  const token = signToken({ id: userId, email, role: 'user' });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: { id: userId, name, email, role: 'user' },
  });
}

// POST /api/auth/login  (shared by both user and admin login forms)
async function login(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  const { email } = req.body;
  const user = await userModel.findUserByEmail(email);

  // Always respond with the same generic message, whether or not the email
  // exists -- this prevents attackers from using this endpoint to discover
  // which emails are registered.
  const genericMessage = 'If that email is registered, a reset link has been sent.';

  if (!user) {
    return res.json({ success: true, message: genericMessage });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

  await resetModel.createResetToken(user.id, token, expiresAt);
  await sendResetPasswordEmail(user.email, token);

  res.json({ success: true, message: genericMessage });
}

// POST /api/auth/reset-password/:token
async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;

  const resetRecord = await resetModel.findValidToken(token);
  if (!resetRecord) {
    return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
  }

  const hashedPassword = await hashPassword(password);
  await userModel.updateUserPassword(resetRecord.user_id, hashedPassword);
  await resetModel.deleteToken(token);

  res.json({ success: true, message: 'Password updated. You can now log in.' });
}

module.exports = { register, login, forgotPassword, resetPassword };
