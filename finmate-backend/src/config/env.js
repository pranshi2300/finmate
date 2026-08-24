const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function validateEnvironment(env = process.env) {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.errors.map((error) => error.path.join('.')).join(', ')}`);
  return parsed.data;
}

module.exports = { validateEnvironment };
