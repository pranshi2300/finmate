const prisma = require('../config/db');
const {
  normalizeMerchantName,
  monthKey,
  monthLabel,
  buildMonthBuckets,
  mean,
} = require('./analyticsHelpers');

async function fetchReceiptMerchants(userId, months = 12) {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - months + 1);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const receipts = await prisma.receipt.findMany({
    where: { userId, receiptDate: { gte: start } },
    select: { vendor: true, totalAmount: true, receiptDate: true },
  });

  return receipts.map((receipt) => ({
    merchant: normalizeMerchantName(receipt.vendor || 'unknown'),
    amount: Number(receipt.totalAmount ?? 0),
    date: new Date(receipt.receiptDate),
  }));
}

function groupByMerchant(records) {
  const map = new Map();
  records.forEach((record) => {
    const existing = map.get(record.merchant) || { merchant: record.merchant, total: 0, count: 0, amounts: [], dates: [] };
    existing.total += record.amount;
    existing.count += 1;
    existing.amounts.push(record.amount);
    existing.dates.push(record.date);
    map.set(record.merchant, existing);
  });
  return Array.from(map.values());
}

function buildMerchantTrend(records, months = 6) {
  const buckets = buildMonthBuckets(months);
  const trendMap = new Map(buckets.map((bucket) => [bucket.key, 0]));

  records.forEach((record) => {
    const key = monthKey(record.date);
    if (trendMap.has(key)) {
      trendMap.set(key, trendMap.get(key) + record.amount);
    }
  });

  return buckets.map((bucket) => ({ month: bucket.label, total: Number(trendMap.get(bucket.key).toFixed(2)) }));
}

async function getMerchantAnalytics(userId, months = 12, limit = 10) {
  const records = await fetchReceiptMerchants(userId, months);
  const merchants = groupByMerchant(records);
  const ranking = merchants
    .map((entry) => ({
      merchant: entry.merchant,
      totalSpend: Number(entry.total.toFixed(2)),
      transactionCount: entry.count,
      averageAmount: Number((entry.total / entry.count).toFixed(2)),
      latestDate: entry.dates.sort((a, b) => b - a)[0]?.toISOString() || null,
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  const totals = ranking.map((entry) => ({ merchant: entry.merchant, totalSpend: entry.totalSpend }));
  const frequency = ranking.map((entry) => ({ merchant: entry.merchant, frequency: entry.transactionCount, averageAmount: entry.averageAmount }));
  const trend = ranking.map((entry) => ({ merchant: entry.merchant, monthlyTrend: buildMerchantTrend(records.filter((r) => r.merchant === entry.merchant), 6) }));
  const comparison = ranking.slice(0, 5).map((entry) => ({
    merchant: entry.merchant,
    totalSpend: entry.totalSpend,
    transactionCount: entry.transactionCount,
    averageAmount: entry.averageAmount,
  }));

  return { ranking, frequency, totals, trend, comparison };
}

module.exports = { getMerchantAnalytics, groupByMerchant, buildMerchantTrend };
