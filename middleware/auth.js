/**
 * middleware/auth.js
 * --------------------
 * Protects routes that require ANY logged-in user (user or admin).
 * Reads the JWT from the "Authorization: Bearer <token>" header,
 * verifies it, and attaches the decoded payload to req.user.
 */

const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token); // { id, email, role, iat, exp }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = requireAuth;
