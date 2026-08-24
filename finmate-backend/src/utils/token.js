const jwt = require("jsonwebtoken");

// Access token: short-lived, sent on every request in the Authorization header.
// Keep the payload minimal — id + role is enough. Never put sensitive data here,
// it's base64-encoded, not encrypted, and can be decoded by anyone.
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
}

// Refresh token: long-lived, stored in DB so it can be revoked on logout,
// and used only to mint new access tokens.
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
