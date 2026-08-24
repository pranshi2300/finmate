const prisma = require('../config/db');
const {
  WEEKDAY_LABELS,
  buildMonthBuckets,
  buildDayBuckets,
  median,
  mean,
  stdDev,
  monthKey,
  monthLabel,
  normalizeMerchantName,
  clamp,
} = require('./analyticsHelpers');

async function fetchUserTransactions(userId, where = {}) {
  return prisma.transaction.findMany({
    where: { userId, ...where },
    orderBy: { date: 'asc' },
  });
}

function safeDate(d) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getSpendingByWeekday(userId, days = 90) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);

  const txs = await fetchUserTransactions(userId, {
    type: 'EXPENSE',
    date: { gte: start },
  });

  const totals = Array(7).fill(0);
  txs.forEach((t) => {
    const d = new Date(t.date);
    totals[d.getUTCDay()] += Number(t.amount);
  });

  return {
    labels: WEEKDAY_LABELS,
    totals: totals.map((value) => Number(value.toFixed(2))),
  };
}

async function getSpendingByHour(userId, days = 90) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);

  const txs = await fetchUserTransactions(userId, {
    type: 'EXPENSE',
    date: { gte: start },
  });

  const totals = Array(24).fill(0);
  txs.forEach((t) => {
    const d = new Date(t.date);
    totals[d.getUTCHours()] += Number(t.amount);
  });

  return {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    totals: totals.map((value) => Number(value.toFixed(2))),
  };
}

async function getMonthlyIncomeTrend(userId, months = 6) {
  const buckets = buildMonthBuckets(months);
  const start = new Date(buckets[0].date);
  const txs = await fetchUserTransactions(userId, {
    type: 'INCOME',
    date: { gte: start },
  });

  const monthMap = new Map(buckets.map((bucket) => [bucket.key, 0]));
  txs.forEach((t) => {
    const key = monthKey(t.date);
    if (monthMap.has(key)) {
      monthMap.set(key, monthMap.get(key) + Number(t.amount));
    }
  });

  return {
    months: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => Number(monthMap.get(bucket.key).toFixed(2))),
  };
}

async function getMonthlySavingsTrend(userId, months = 6) {
  const buckets = buildMonthBuckets(months);
  const start = new Date(buckets[0].date);
  const txs = await fetchUserTransactions(userId, { date: { gte: start } });

  const monthMap = new Map(buckets.map((bucket) => [bucket.key, 0]));
  txs.forEach((t) => {
    const key = monthKey(t.date);
    if (!monthMap.has(key)) return;
    monthMap.set(key, monthMap.get(key) + (t.type === 'INCOME' ? Number(t.amount) : -Number(t.amount)));
  });

  return {
    months: buckets.map((bucket) => bucket.label),
    values: buckets.map((bucket) => Number(monthMap.get(bucket.key).toFixed(2))),
  };
}

async function getExpenseToIncomeRatio(userId, months = 6) {
  const buckets = buildMonthBuckets(months);
  const start = new Date(buckets[0].date);
  const txs = await fetchUserTransactions(userId, { date: { gte: start } });

  const incomeMap = new Map(buckets.map((bucket) => [bucket.key, 0]));
  const expenseMap = new Map(buckets.map((bucket) => [bucket.key, 0]));

  txs.forEach((t) => {
    const key = monthKey(t.date);
    if (!incomeMap.has(key)) return;
    if (t.type === 'INCOME') incomeMap.set(key, incomeMap.get(key) + Number(t.amount));
    else expenseMap.set(key, expenseMap.get(key) + Number(t.amount));
  });

  const ratios = buckets.map((bucket) => {
    const income = incomeMap.get(bucket.key);
    const expense = expenseMap.get(bucket.key);
    return income === 0 ? null : Number(((expense / income) * 100).toFixed(2));
  });

  return {
    months: buckets.map((bucket) => bucket.label),
    ratios,
    currentRatio: ratios[ratios.length - 1],
  };
}

async function getMerchantInsights(userId, months = 12, limit = 10) {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - months + 1);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const receipts = await prisma.receipt.findMany({
    where: { userId, receiptDate: { gte: start } },
    select: {
      vendor: true,
      totalAmount: true,
      receiptDate: true,
      transaction: { select: { id: true } },
    },
  });

  const merchants = new Map();
  receipts.forEach((receipt) => {
    const merchant = normalizeMerchantName(receipt.vendor || 'unknown');
    const item = merchants.get(merchant) || { merchant, total: 0, count: 0, amounts: [], dates: [] };
    item.total += Number(receipt.totalAmount ?? 0);
    item.count += 1;
    item.amounts.push(Number(receipt.totalAmount ?? 0));
    item.dates.push(new Date(receipt.receiptDate).toISOString());
    merchants.set(merchant, item);
  });

  const rows = Array.from(merchants.values()).map((entry) => ({
    merchant: entry.merchant,
    totalSpend: Number(entry.total.toFixed(2)),
    transactionCount: entry.count,
    averageAmount: Number((entry.total / entry.count).toFixed(2)),
    lastSeen: entry.dates.sort().pop(),
  }));

  rows.sort((a, b) => b.totalSpend - a.totalSpend);

  return {
    ranking: rows.slice(0, limit).map((row, index) => ({ ...row, rank: index + 1 })),
    frequency: rows.slice(0, limit).map((row) => ({ merchant: row.merchant, frequency: row.transactionCount, averageAmount: row.averageAmount })),
    totals: rows.slice(0, limit).map((row) => ({ merchant: row.merchant, totalSpend: row.totalSpend })),
    trend: rows.slice(0, limit).map((row) => ({ merchant: row.merchant, monthlyTrend: [] })),
    comparison: rows.slice(0, 2).map((row) => ({ merchant: row.merchant, totalSpend: row.totalSpend, frequency: row.transactionCount, averageAmount: row.averageAmount })),
  };
}

async function getTopRecurringMerchants(userId, months = 12, threshold = 3) {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - months + 1);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const receipts = await prisma.receipt.findMany({
    where: { userId, receiptDate: { gte: start } },
    select: { vendor: true, totalAmount: true, receiptDate: true },
  });

  const merchants = new Map();
  receipts.forEach((receipt) => {
    const merchant = normalizeMerchantName(receipt.vendor || 'unknown');
    const item = merchants.get(merchant) || { merchant, amounts: [], dates: [] };
    item.amounts.push(Number(receipt.totalAmount ?? 0));
    item.dates.push(new Date(receipt.receiptDate));
    merchants.set(merchant, item);
  });

  const recurring = [];
  for (const item of merchants.values()) {
    if (item.dates.length < threshold) continue;
    const dates = item.dates.sort((a, b) => a - b);
    const intervals = [];
    for (let i = 1; i < dates.length; i += 1) {
      intervals.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
    }
    const avgInterval = mean(intervals);
    const identicalAmount = stdDev(item.amounts) <= mean(item.amounts) * 0.08;
    if (avgInterval >= 26 && avgInterval <= 35 && identicalAmount) {
      recurring.push({
        merchant: item.merchant,
        averageAmount: Number(mean(item.amounts).toFixed(2)),
        occurrences: item.dates.length,
        averageIntervalDays: Number(avgInterval.toFixed(1)),
      });
    }
  }

  recurring.sort((a, b) => b.occurrences - a.occurrences || b.averageAmount - a.averageAmount);
  return recurring.slice(0, threshold * 3);
}

async function getCategoryGrowthDetails(userId, months = 6) {
  const buckets = buildMonthBuckets(months);
  const start = new Date(buckets[0].date);
  const txs = await fetchUserTransactions(userId, {
    type: 'EXPENSE',
    date: { gte: start },
  });

  const monthlyTotals = new Map(buckets.map((b) => [b.key, {}]));
  txs.forEach((t) => {
    const key = monthKey(t.date);
    const bucket = monthlyTotals.get(key);
    if (!bucket) return;
    bucket[t.category] = (bucket[t.category] || 0) + Number(t.amount);
  });

  const categories = new Set();
  Array.from(monthlyTotals.values()).forEach((bucket) => Object.keys(bucket).forEach((cat) => categories.add(cat)));

  const changes = [];
  for (const category of categories) {
    const values = buckets.map((bucket) => monthlyTotals.get(bucket.key)[category] || 0);
    for (let i = 1; i < values.length; i += 1) {
      changes.push({
        category,
        month: buckets[i].label,
        change: Number((values[i] - values[i - 1]).toFixed(2)),
        previous: Number(values[i - 1].toFixed(2)),
        current: Number(values[i].toFixed(2)),
      });
    }
  }

  if (!changes.length) {
    return {
      fastestGrowingExpenseCategory: null,
      largestMonthOverMonthIncrease: null,
      largestMonthOverMonthDecrease: null,
    };
  }

  const fastestGrowing = changes.filter((c) => c.change > 0).sort((a, b) => b.change - a.change)[0] || null;
  const largestIncrease = changes.sort((a, b) => b.change - a.change)[0] || null;
  const largestDecrease = changes.sort((a, b) => a.change - b.change)[0] || null;

  return {
    fastestGrowingExpenseCategory: fastestGrowing,
    largestMonthOverMonthIncrease: largestIncrease,
    largestMonthOverMonthDecrease: largestDecrease,
  };
}

async function getTransactionSizeStats(userId, months = 6, type = 'EXPENSE') {
  const buckets = buildMonthBuckets(months);
  const start = new Date(buckets[0].date);
  const txs = await fetchUserTransactions(userId, { type, date: { gte: start } });
  const amounts = txs.map((t) => Number(t.amount));
  return {
    averageTransactionAmount: Number(mean(amounts).toFixed(2)),
    medianTransactionAmount: Number(median(amounts).toFixed(2)),
    transactionCount: amounts.length,
  };
}

async function getSpendingVolatility(userId, days = 90) {
  const buckets = buildDayBuckets(days);
  const start = buckets[0];
  const txs = await fetchUserTransactions(userId, { type: 'EXPENSE', date: { gte: start } });
  const dailyMap = new Map(buckets.map((date) => [date.toISOString(), 0]));
  txs.forEach((t) => {
    const d = new Date(t.date);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key) + Number(t.amount));
  });
  const dailyValues = Array.from(dailyMap.values());
  const sigma = stdDev(dailyValues);
  const average = mean(dailyValues);
  const score = average === 0 ? 0 : clamp(Number(((sigma / average) * 100).toFixed(2)), 0, 200);
  return {
    dailyVolatility: Number(sigma.toFixed(2)),
    meanDailyExpense: Number(average.toFixed(2)),
    volatilityScore: score,
  };
}

module.exports = {
  getSpendingByWeekday,
  getSpendingByHour,
  getMonthlyIncomeTrend,
  getMonthlySavingsTrend,
  getExpenseToIncomeRatio,
  getMerchantInsights,
  getTopRecurringMerchants,
  getCategoryGrowthDetails,
  getTransactionSizeStats,
  getSpendingVolatility,
};
