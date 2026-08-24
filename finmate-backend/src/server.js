require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { validateEnvironment } = require('./config/env');
const logger = require('./utils/logger');
const openapi = require('./docs/openapi');
const { sanitizeRequest } = require('./middleware/sanitize');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const groupRoutes = require('./routes/groupRoutes');
const receiptRoutes = require('./routes/receiptRoutes');
const insightsRoutes = require('./routes/insightsRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const env = validateEnvironment();
const allowedOrigins = (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    logger.warn('CORS request blocked', { origin });
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeRequest);
app.use(cookieParser());

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many authentication attempts. Please try again later.' } });

app.get('/health', (req, res) => res.json({ status: 'ok' }));
if (env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'FinMate API Docs' }));

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

if (require.main === module) {
  const server = app.listen(env.PORT, () => logger.info('FinMate API started', { port: env.PORT, environment: env.NODE_ENV }));
  const shutdown = (signal) => server.close(() => logger.info('FinMate API stopped', { signal }));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
