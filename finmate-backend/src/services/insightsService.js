const prisma = require('../config/db');

function startOfMonth(d) {
  const dt = new Date(d);
  dt.setDate(1);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfMonth(d) {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + 1, 0);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function isoDate(d) {
  return new Date(d).toISOString();
}

async function getSummary(userId) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Sum income and expenses for current month
  const sums = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId,
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { amount: true },
  });

  const income = Number(sums.find(s => s.type === 'INCOME')?._sum?.amount || 0);
  const expenses = Number(sums.find(s => s.type === 'EXPENSE')?._sum?.amount || 0);
  const savings = income - expenses;

  // Highest single expense overall (recent 12 months)
  const yearAgo = new Date();
  yearAgo.setMonth(yearAgo.getMonth() - 12);
  const highest = await prisma.transaction.findFirst({
    where: { userId, type: 'EXPENSE', date: { gte: yearAgo } },
    orderBy: { amount: 'desc' },
  });

  // Average daily spending for this month (days elapsed)
  const dayOfMonth = (now.getDate());
  const avgDaily = dayOfMonth ? expenses / dayOfMonth : 0;

  // Top categories (expenses) last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const byCategory = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, type: 'EXPENSE', date: { gte: threeMonthsAgo } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const topCategories = byCategory.slice(0, 5).map(c => ({ category: c.category, amount: Number(c._sum.amount) }));

  return {
    month: { start: isoDate(monthStart), end: isoDate(monthEnd) },
    income,
    expenses,
    savings,
    highestExpense: highest ? { id: highest.id, amount: Number(highest.amount), date: highest.date, category: highest.category, note: highest.note } : null,
    avgDaily: Number(avgDaily.toFixed(2)),
    topCategories,
  };
}

/**
 * Build weekly trend buckets for the last N weeks.
 */
function getWeekBuckets(weeks = 8) {
  const buckets = [];
  const now = new Date();
  // Create buckets ending on the most recent Sunday (or today)
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  for (let i = 0; i < weeks; i++) {
    const bucketEnd = new Date(end);
    bucketEnd.setDate(end.getDate() - (7 * i));
    bucketEnd.setHours(23, 59, 59, 999);
    const bucketStart = new Date(bucketEnd);
    bucketStart.setDate(bucketEnd.getDate() - 6);
    bucketStart.setHours(0, 0, 0, 0);
    buckets.unshift({ start: bucketStart, end: bucketEnd });
  }
  return buckets;
}

async function getSpendingTrends(userId, weeks = 8) {
  const buckets = getWeekBuckets(weeks);
  const start = buckets[0].start;

  // Fetch recent transactions once
  const txs = await prisma.transaction.findMany({
    where: { userId, date: { gte: start } },
    orderBy: { date: 'asc' },
  });

  const weekly = buckets.map(b => ({ start: isoDate(b.start), end: isoDate(b.end), income: 0, expenses: 0 }));

  for (const t of txs) {
    const idx = buckets.findIndex(b => t.date >= b.start && t.date <= b.end);
    if (idx === -1) continue;
    if (t.type === 'INCOME') weekly[idx].income += Number(t.amount);
    else weekly[idx].expenses += Number(t.amount);
  }

  // Month-over-month comparison: compare current month vs previous
  const now = new Date();
  const currentStart = startOfMonth(now);
  const prev = new Date(currentStart);
  prev.setMonth(prev.getMonth() - 1);
  const prevStart = startOfMonth(prev);
  const prevEnd = endOfMonth(prev);

  const [currentSumRes, prevSumRes] = await Promise.all([
    prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE', date: { gte: currentStart, lte: endOfMonth(now) } }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } }, _sum: { amount: true } }),
  ]);

  const currentExpenses = Number(currentSumRes._sum.amount || 0);
  const prevExpenses = Number(prevSumRes._sum.amount || 0);
  const momChange = prevExpenses ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : null;

  return { weekly, monthComparison: { currentExpenses, prevExpenses, momChange } };
}

async function getCategoryAnalysis(userId, months = 6) {
  const from = new Date();
  from.setMonth(from.getMonth() - months + 1);
  from.setHours(0, 0, 0, 0);

  const byCategory = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, type: 'EXPENSE', date: { gte: from } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const categories = byCategory.map(c => ({ category: c.category, amount: Number(c._sum.amount) }));

  // Budgets and utilization for current month
  const budgets = await prisma.budget.findMany({ where: { userId } });
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const utilizations = [];
  for (const b of budgets) {
    const spentRes = await prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE', category: b.category, date: { gte: monthStart, lte: monthEnd } }, _sum: { amount: true } });
    const spent = Number(spentRes._sum.amount || 0);
    utilizations.push({ category: b.category, monthlyLimit: Number(b.monthlyLimit), spent, utilization: Math.min(100, Number(((spent / Number(b.monthlyLimit || 1)) * 100).toFixed(2))) });
  }

  return { categories, utilizations };
}

/**
 * Simple anomaly detection: flag transactions that are greater than mean + 3*std
 */
async function getSpendingAnomalies(userId, days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const txs = await prisma.transaction.findMany({ where: { userId, type: 'EXPENSE', date: { gte: since } } });
  const amounts = txs.map(t => Number(t.amount));
  if (!amounts.length) return [];
  const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
  const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length;
  const std = Math.sqrt(variance);
  const threshold = mean + 3 * std;
  const anomalies = txs.filter(t => Number(t.amount) > threshold).map(t => ({ id: t.id, amount: Number(t.amount), date: t.date, category: t.category, note: t.note }));
  return { anomalies, mean: Number(mean.toFixed(2)), std: Number(std.toFixed(2)), threshold: Number(threshold.toFixed(2)) };
}

function generateRecommendationsFromSummary(summary, categoryAnalysis, anomalies, budgets) {
  const recs = [];
  // Spending increase
  if (summary && summary.topCategories && summary.topCategories.length) {
    const top = summary.topCategories[0];
    recs.push(`${top.category} is your top spending category recently (${top.amount.toFixed(2)}). Consider reviewing recurring purchases there.`);
  }

  if (summary.monthComparison && summary.monthComparison.momChange !== null) {
    const change = summary.monthComparison.momChange;
    if (change > 5) recs.push(`Your expenses increased by ${change.toFixed(1)}% compared to last month.`);
    else if (change < -5) recs.push(`Good job — expenses decreased by ${Math.abs(change).toFixed(1)}% compared to last month.`);
  }

  // Budget warnings
  for (const b of budgets) {
    if (b.utilization >= 90) {
      recs.push(`You are close to exceeding your ${b.category} budget (${b.utilization}% used).`);
    } else if (b.utilization >= 75) {
      recs.push(`Your ${b.category} spending is high this month (${b.utilization}% of budget).`);
    }
  }

  // anomalies
  if (anomalies && anomalies.anomalies && anomalies.anomalies.length) {
    recs.push(`Detected ${anomalies.anomalies.length} unusual high-value transaction(s). Review them for mistakes or one-off purchases.`);
  }

  // Simple savings insight
  if (summary && typeof summary.savings === 'number' && summary.income > 0) {
    const rate = (summary.savings / summary.income) * 100;
    if (rate >= 20) recs.push(`Nice — your savings rate is ${rate.toFixed(1)}% this month.`);
    else if (rate < 5) recs.push(`Your savings rate is low (${rate.toFixed(1)}%). Consider setting aside a small automatic transfer.`);
  }

  return recs;
}

module.exports = {
  getSummary,
  getSpendingTrends,
  getCategoryAnalysis,
  getSpendingAnomalies,
  generateRecommendationsFromSummary,
};
