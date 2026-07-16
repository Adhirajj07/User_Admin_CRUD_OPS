/**
 * models/requestModel.js
 * All raw SQL for the `requests` table lives here.
 */
const { db } = require('../config/database');

async function createRequest({ userId, title, description, category }) {
  const result = await db.run(
    `INSERT INTO requests (user_id, title, description, category, status)
     VALUES (?, ?, ?, ?, 'Pending')`,
    [userId, title, description, category]
  );
  return result.lastID;
}

async function getRequestById(id) {
  return db.get('SELECT * FROM requests WHERE id = ?', [id]);
}

async function getRequestsByUser(userId) {
  return db.all('SELECT * FROM requests WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

async function updateRequest(id, { title, description, category }) {
  return db.run(
    `UPDATE requests
     SET title = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [title, description, category, id]
  );
}

async function deleteRequest(id) {
  return db.run('DELETE FROM requests WHERE id = ?', [id]);
}

async function updateStatus(id, status) {
  return db.run(
    `UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [status, id]
  );
}

/**
 * Admin view: all requests, joined with the requester's name/email,
 * with optional search/filter/sort applied directly in SQL.
 */
async function getAllRequests({ search, status, sort } = {}) {
  let sql = `
    SELECT requests.*, users.name AS user_name, users.email AS user_email
    FROM requests
    JOIN users ON users.id = requests.user_id
    WHERE 1 = 1
  `;
  const params = [];

  if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
    sql += ' AND requests.status = ?';
    params.push(status);
  }

  if (search) {
    sql += ' AND (requests.title LIKE ? OR requests.description LIKE ? OR requests.category LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like, like);
  }

  sql += sort === 'oldest' ? ' ORDER BY requests.created_at ASC' : ' ORDER BY requests.created_at DESC';

  return db.all(sql, params);
}

module.exports = {
  createRequest,
  getRequestById,
  getRequestsByUser,
  updateRequest,
  deleteRequest,
  updateStatus,
  getAllRequests,
};
