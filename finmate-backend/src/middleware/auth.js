const { verifyAccessToken } = require("../utils/token");
const logger = require('../utils/logger');

// Protects routes: expects "Authorization: Bearer <token>".
// On success, attaches { id, role } to req.user for downstream handlers.
function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    logger.warn('Authentication failed: malformed authorization header', { path: req.originalUrl, ip: req.ip });
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = header.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    logger.warn('Authentication failed: invalid access token', { path: req.originalUrl, ip: req.ip, reason: err.name });
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired" });
    }
    return res.status(401).json({ error: "Invalid access token" });
  }
}

// Role-based access control — usage: requireRole("ADMIN")
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
