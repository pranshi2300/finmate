// Central error handler — every route should call next(err) on failure
// instead of handling try/catch res.status() individually everywhere.
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled request error', { method: req.method, path: req.originalUrl, status: err.status || 500, code: err.code, name: err.name, message: err.message });

  // Prisma unique constraint violation (e.g. duplicate email)
  if (err.code === "P2002") {
    return res.status(409).json({ error: `${err.meta?.target?.[0] || "Field"} already in use` });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.status) {
    return res.status(err.status).json({ error: process.env.NODE_ENV === 'production' && err.status >= 500 ? 'Request failed' : err.message });
  }

  res.status(500).json({ error: "Internal server error" });
}

// Wraps async route handlers so thrown errors go to errorHandler
// instead of crashing the process or needing manual try/catch everywhere.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
