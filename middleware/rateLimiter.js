/**
 * middleware/rateLimiter.js
 * Slows down brute-force attempts against login / forgot-password.
 */
const rateLimit = require('express-rate-limit');

// Generous general limiter for the whole API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter specifically for login/register/forgot-password
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

module.exports = { generalLimiter, authLimiter };
