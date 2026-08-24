const assert = require('assert');

const dbPath = require.resolve('../src/config/db');
const contextPath = require.resolve('../src/services/ai/contextBuilder');
const rulesPath = require.resolve('../src/services/notifications/notificationRules');
const writes = [];

require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  notificationPreference: { upsert: async () => ({ enabled: true }) },
  notification: { upsert: async (args) => { writes.push(args); return args.create; } },
} };
require.cache[contextPath] = { id: contextPath, filename: contextPath, loaded: true, exports: { buildFinancialContext: async () => ({}) } };
require.cache[rulesPath] = { id: rulesPath, filename: rulesPath, loaded: true, exports: {
  notificationRules: () => [{ title: 'Budget alert', description: 'Test', priority: 'high', type: 'budget', dedupeKey: 'budget:Food:2026-07-22' }],
  applyPreferences: (notifications) => notifications,
} };

const { generateNotifications } = require('../src/services/notifications/notificationService');

(async () => {
  await generateNotifications('user-a');
  assert.deepStrictEqual(writes[0].where, { userId_dedupeKey: { userId: 'user-a', dedupeKey: 'budget:Food:2026-07-22' } });
  console.log('notification service tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
