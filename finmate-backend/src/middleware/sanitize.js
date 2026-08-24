const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !FORBIDDEN_KEYS.has(key))
    .map(([key, item]) => [key, typeof item === 'string' ? item.replace(/\0/g, '') : sanitize(item)]));
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
  next();
}

module.exports = { sanitizeRequest };
