/**
 * config/database.js
 * -------------------
 * Opens the SQLite file, wraps the callback-based `sqlite3` API in Promises
 * (so the rest of the app can use async/await), creates tables if they
 * don't exist yet, and seeds a single Admin account from .env on first run.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

const DB_PATH = process.env.DB_PATH || './database/database.sqlite';

// Make sure the /database folder exists before sqlite tries to create the file
const dbFolder = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}

const rawDb = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
    process.exit(1);
  }
});

// Enforce foreign key constraints (off by default in SQLite)
rawDb.run('PRAGMA foreign_keys = ON');

/**
 * Promise wrappers around sqlite3's callback API.
 * - run()  -> for INSERT / UPDATE / DELETE (returns lastID / changes)
 * - get()  -> for SELECT that returns a single row
 * - all()  -> for SELECT that returns multiple rows
 */
const db = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      rawDb.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  },
};

/**
 * Creates all tables (if they don't exist) and seeds the admin account.
 * Called once from server.js on startup.
 */
async function initDatabase() {
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await seedAdmin();
}

/**
 * Creates the admin account defined in .env if it doesn't already exist.
 * This is what makes "Admin login" work without a separate registration flow.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return;

  const name = process.env.ADMIN_NAME || 'Administrator';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hashed = await bcrypt.hash(plainPassword, 10);

  await db.run(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
    [name, email, hashed, 'admin']
  );

  console.log(`Seeded admin account -> email: ${email} (password from .env)`);
}

module.exports = { db, initDatabase };
