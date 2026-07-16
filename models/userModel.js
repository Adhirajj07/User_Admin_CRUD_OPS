/**
 * models/userModel.js
 * All raw SQL for the `users` table lives here, and nowhere else.
 */
const { db } = require('../config/database');

async function createUser({ name, email, hashedPassword, role = 'user' }) {
  const result = await db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashedPassword, role]
  );
  return result.lastID;
}

async function findUserByEmail(email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

async function findUserById(id) {
  return db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [id]);
}

async function updateUserPassword(userId, hashedPassword) {
  return db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
}

module.exports = { createUser, findUserByEmail, findUserById, updateUserPassword };
