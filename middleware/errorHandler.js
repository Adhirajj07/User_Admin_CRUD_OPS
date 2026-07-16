/**
 * middleware/errorHandler.js
 * Catches anything passed to next(err) or thrown in an async route
 * (via the asyncHandler wrapper) and returns a clean JSON error instead
 * of leaking a stack trace to the client.
 */

function errorHandler(err, req, res, next) {
  console.error(err); // full detail in server logs

  // SQLite unique constraint (e.g. duplicate email) safety net
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    return res.status(409).json({ success: false, message: 'That value is already in use.' });
  }

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Something went wrong on the server.' : err.message,
  });
}

// Wraps async route handlers so thrown errors/rejected promises reach errorHandler
// instead of crashing the process or hanging the request.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
