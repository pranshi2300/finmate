const prisma = require('../config/db');
const { normalizeMerchantName, mean, stdDev } = require('./analyticsHelpers');

async function fetchTransactions(userId, months = 12) {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - months + 1);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  return prisma.transaction.findMany({
    where: { userId, type: 'EXPENSE', date: { gte: start } },
    orderBy: { date: 'asc' },
    select: { id: true, amount: true, date: true, category: true, note: true, receiptId: true },
  });
}

function monthDistance(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.abs((a.getUTCFullYear() - b.getUTCFullYear()) * 12 + (a.getUTCMonth() - b.getUTCMonth()));
}

function groupByMerchant(records) {
  const map = new Map();
  records.forEach((record) => {
    const merchant = normalizeMerchantName(record.note || 'unknown');
    const existing = map.get(merchant) || { merchant, entries: [] };
    existing.entries.push(record);
    map.set(merchant, existing);
  });
  return Array.from(map.values());
}

function findRecurringPatterns(merchantGroup) {
  const entries = merchantGroup.entries.filter((entry) => entry.amount > 0);
  if (entries.length < 3) return null;

  const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const intervals = [];
  for (let i = 1; i < sorted.length; i += 1) {
    intervals.push((new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24));
  }
  if (!intervals.length) return null;

  const avgInterval = mean(intervals);
  const intervalStd = stdDev(intervals);
  const amounts = sorted.map((entry) => Number(entry.amount));
  const amountMean = mean(amounts);
  const amountStd = stdDev(amounts);

  if (avgInterval < 25 || avgInterval > 35 || intervalStd > 5) return null;
  if (amountStd > amountMean * 0.12) return null;

  const lastDate = new Date(sorted[sorted.length - 1].date);
  const nextDate = new Date(lastDate);
  nextDate.setUTCDate(lastDate.getUTCDate() + Math.round(avgInterval));

  const confidence = Math.round(100 - (intervalStd / 10 + (amountStd / amountMean) * 50));

  return {
    merchant: merchantGroup.merchant,
    estimatedBillingCycleDays: Number(avgInterval.toFixed(1)),
    averageAmount: Number(amountMean.toFixed(2)),
    confidence: Math.max(0, Math.min(100, confidence)),
    nextExpectedPayment: nextDate.toISOString(),
    occurrences: sorted.length,
  };
}

async function detectSubscriptions(userId, months = 12) {
  const txs = await fetchTransactions(userId, months);
  const grouped = groupByMerchant(txs);
  const subscriptions = grouped
    .map(findRecurringPatterns)
    .filter((item) => item && item.confidence >= 60)
    .sort((a, b) => b.confidence - a.confidence || b.averageAmount - a.averageAmount);

  return { subscriptions: subscriptions.slice(0, 10) };
}

module.exports = { detectSubscriptions, groupByMerchant, findRecurringPatterns };
