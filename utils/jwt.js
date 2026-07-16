/**
 * utils/jwt.js
 * Signs and verifies JWTs. The payload only ever contains non-sensitive
 * identifiers (id, email, role) -- never the password hash.
 */
const jwt = require('jsonwebtoken');

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

function verifyToken(token) {
  // Throws if invalid/expired -- caller (middleware) catches this.
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
