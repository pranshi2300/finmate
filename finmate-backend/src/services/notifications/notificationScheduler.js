const prisma = require('../../config/db');
const { generateNotifications } = require('./notificationService');

async function runForUsers(task) {
  const users = await prisma.user.findMany({ select: { id: true } });
  return Promise.all(users.map((user) => task(user.id)));
}

// Deliberately callable jobs, not cron registrations. A future node-cron or
// BullMQ worker can call these functions without changing rule/service code.
async function runDaily() { return runForUsers(generateNotifications); }
async function runWeeklySummary() { return runForUsers(generateNotifications); }
async function runMonthlyReport() { return runForUsers(generateNotifications); }

module.exports = { runDaily, runWeeklySummary, runMonthlyReport };
