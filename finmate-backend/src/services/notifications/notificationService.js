const prisma = require('../../config/db');
const { buildFinancialContext } = require('../ai/contextBuilder');
const { notificationRules, applyPreferences } = require('./notificationRules');
const { formatNotification } = require('./notificationFormatter');
const logger = require('../../utils/logger');

const DEFAULT_PREFERENCES = { enabled: true, budget: true, forecasts: true, subscriptions: true, savings: true, aiAdvisor: true, achievements: true };

async function getPreferences(userId) {
  return prisma.notificationPreference.upsert({ where: { userId }, create: { userId }, update: {} });
}

async function updatePreferences(userId, values) {
  return prisma.notificationPreference.upsert({ where: { userId }, create: { userId, ...values }, update: values });
}

async function generateNotifications(userId) {
  const [context, preferences] = await Promise.all([buildFinancialContext(userId), getPreferences(userId)]);
  const rules = applyPreferences(notificationRules(context), preferences);
  const writes = rules.map((notification) => prisma.notification.upsert({
    where: { userId_dedupeKey: { userId, dedupeKey: notification.dedupeKey } },
    create: { userId, ...notification },
    update: {},
  }));
  const results = await Promise.all(writes);
  logger.info('Notifications generated', { userId, count: results.length });
  return results;
}

async function listNotifications(userId, { unreadOnly = false, page = 1, limit = 30 } = {}) {
  const where = { userId, ...(unreadOnly ? { read: false } : {}) };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.notification.count({ where }), prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { notifications, unreadCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

async function markRead(userId, id) {
  const result = await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  return result.count > 0;
}

async function markAllRead(userId) { return prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } }); }
async function deleteNotification(userId, id) { const result = await prisma.notification.deleteMany({ where: { id, userId } }); return result.count > 0; }

async function createTestNotification(userId) {
  return prisma.notification.create({ data: { userId, ...formatNotification({ title: 'Test notification', description: 'Notifications are working correctly for your account.', priority: 'low', type: 'test', action: { type: 'open-notifications' } }) } });
}

module.exports = { DEFAULT_PREFERENCES, getPreferences, updatePreferences, generateNotifications, listNotifications, markRead, markAllRead, deleteNotification, createTestNotification };
