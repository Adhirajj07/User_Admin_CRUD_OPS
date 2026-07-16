/**
 * models/passwordResetModel.js
 * All raw SQL for the `password_resets` table.
 */
const { db } = require('../config/database');

async function createResetToken(userId, token, expiresAt) {
  // Remove any previous tokens for this user first, so only one is ever valid
  await db.run('DELETE FROM password_resets WHERE user_id = ?', [userId]);
  return db.run(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}

async function findValidToken(token) {
  return db.get(
    `SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );
}

async function deleteToken(token) {
  return db.run('DELETE FROM password_resets WHERE token = ?', [token]);
}

module.exports = { createResetToken, findValidToken, deleteToken };
