const REDACTED_KEYS = new Set(['authorization', 'cookie', 'password', 'passwordHash', 'refreshToken', 'accessToken', 'token']);

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, REDACTED_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : sanitize(item)]));
}

function write(level, message, meta) {
  const entry = { timestamp: new Date().toISOString(), level, message, ...(meta ? { meta: sanitize(meta) } : {}) };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  debug: (message, meta) => { if (process.env.LOG_LEVEL === 'debug') write('debug', message, meta); },
};
