/**
 * middleware/adminAuth.js
 * -------------------------
 * Runs AFTER requireAuth. Blocks anyone whose JWT role isn't 'admin'.
 * This is what stops a normal user from hitting /api/admin/* routes
 * even if they know the URL.
 */

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

module.exports = requireAdmin;
