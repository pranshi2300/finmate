const assert = require('assert');
const dbPath = require.resolve('../src/config/db');
const servicePath = require.resolve('../src/services/notifications/notificationService');
let generated = [];
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { user: { findMany: async () => [{ id: 'u1' }, { id: 'u2' }] } } };
require.cache[servicePath] = { id: servicePath, filename: servicePath, loaded: true, exports: { generateNotifications: async (id) => { generated.push(id); return []; } } };
const { runDaily, runWeeklySummary, runMonthlyReport } = require('../src/services/notifications/notificationScheduler');
(async () => { await runDaily(); await runWeeklySummary(); await runMonthlyReport(); assert.strictEqual(generated.length, 6); console.log('notification scheduler tests passed'); })().catch((error) => { console.error(error); process.exitCode = 1; });
