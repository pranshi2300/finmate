const prisma = require('../config/db');

/**
 * Simple time series helpers and forecasting algorithms.
 * Algorithms are intentionally small and modular so they can be
 * replaced later with ML-based models or external services.
 */

function movingAverage(series, window) {
  // series: [Number]
  if (!Array.isArray(series) || series.length === 0) return [];
  const res = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowSlice = series.slice(start, i + 1);
    const avg = windowSlice.reduce((s, v) => s + v, 0) / windowSlice.length;
    res.push(avg);
  }
  return res;
}

function weightedMovingAverage(series, weights) {
  // weights: [w0, w1, ...] length defines window
  if (!Array.isArray(series) || series.length === 0) return [];
  const window = weights.length;
  const sumW = weights.reduce((s, w) => s + w, 0);
  const res = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const wSlice = weights.slice(weights.length - slice.length);
    let s = 0;
    for (let j = 0; j < slice.length; j++) s += slice[j] * wSlice[j];
    res.push(s / (wSlice.reduce((acc, v) => acc + v, 0) || 1));
  }
  return res;
}

function linearTrendPredict(series, nPredict = 1) {
  // Simple linear regression on index -> value, returns nPredict future values
  if (!Array.isArray(series) || series.length === 0) return [];
  const n = series.length;
  const xMean = (n - 1) / 2; // mean of 0..n-1
  const yMean = series.reduce((s, v) => s + v, 0) / n;
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = series[i];
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) * (x - xMean);
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  const preds = [];
  for (let k = 1; k <= nPredict; k++) {
    const x = n - 1 + k;
    preds.push(intercept + slope * x);
  }
  return preds;
}

/**
 * Aggregate daily expenses for a range (inclusive)
 */
async function fetchDailySeries(userId, fromDate, toDate) {
  // returns [{date: ISO, amount: Number}] covering each date in range (0 if none)
  const txs = await prisma.transaction.findMany({
    where: { userId, type: 'EXPENSE', date: { gte: fromDate, lte: toDate } },
    orderBy: { date: 'asc' },
  });

  // normalize to dates
  const days = [];
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d));

  const map = new Map();
  for (const t of txs) {
    const k = new Date(t.date);
    k.setHours(0, 0, 0, 0);
    const key = k.toISOString();
    map.set(key, (map.get(key) || 0) + Number(t.amount));
  }

  return days.map(d => ({ date: d.toISOString(), amount: Number(map.get(d.toISOString()) || 0) }));
}

/**
 * Monthly spending prediction using selected algorithm.
 * windowDays applied for moving averages.
 */
async function predictMonthEnd(userId, options = {}) {
  const { algorithm = 'linear', windowDays = 7 } = options;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const seriesRaw = await fetchDailySeries(userId, monthStart.toISOString(), today.toISOString());
  const series = seriesRaw.map(s => s.amount);

  let predictedRemaining = 0;
  if (algorithm === 'moving') {
    const ma = movingAverage(series, windowDays);
    const last = ma[ma.length - 1] || 0;
    const daysLeft = (monthEnd.getDate() - today.getDate());
    predictedRemaining = last * daysLeft;
  } else if (algorithm === 'weighted') {
    // weights for last 7 days by recency
    const weights = Array.from({ length: Math.min(windowDays, series.length) }, (_, i) => i + 1);
    const wma = weightedMovingAverage(series, weights);
    const last = wma[wma.length - 1] || 0;
    const daysLeft = (monthEnd.getDate() - today.getDate());
    predictedRemaining = last * daysLeft;
  } else {
    // linear trend
    const preds = linearTrendPredict(series, (monthEnd.getDate() - today.getDate()));
    predictedRemaining = preds.reduce((s, v) => s + Math.max(0, v), 0);
  }

  const spentSoFar = series.reduce((s, v) => s + v, 0);
  const predictedTotal = spentSoFar + predictedRemaining;
  return { spentSoFar: Number(spentSoFar.toFixed(2)), predictedRemaining: Number(predictedRemaining.toFixed(2)), predictedTotal: Number(predictedTotal.toFixed(2)), monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString() };
}

/**
 * Category-wise prediction: produce predicted total for each category for current month
 */
async function predictByCategory(userId, options = {}) {
  const { algorithm = 'linear', windowDays = 7 } = options;
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  // fetch categories existing on user's transactions
  const categoriesRes = await prisma.transaction.groupBy({
    by: ['category'],
    where: { userId, type: 'EXPENSE' },
    _sum: { amount: true },
  });
  const categories = categoriesRes.map(r => r.category);
  const categoryTransactions = await prisma.transaction.findMany({
    where: { userId, type: 'EXPENSE', date: { gte: monthStart, lte: today } },
    select: { category: true, amount: true, date: true },
  });
  const transactionsByCategory = new Map();
  for (const transaction of categoryTransactions) {
    const transactions = transactionsByCategory.get(transaction.category) || [];
    transactions.push(transaction);
    transactionsByCategory.set(transaction.category, transactions);
  }

  const results = [];
  for (const cat of categories) {
    // Build daily series for this category
    const txs = transactionsByCategory.get(cat) || [];
    const dayMap = new Map();
    const start = new Date(monthStart);
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) dayMap.set(new Date(d).toISOString(), 0);
    for (const t of txs) {
      const k = new Date(t.date); k.setHours(0, 0, 0, 0);
      const key = k.toISOString();
      dayMap.set(key, (dayMap.get(key) || 0) + Number(t.amount));
    }
    const series = Array.from(dayMap.values());

    let predictedRemaining = 0;
    if (algorithm === 'moving') {
      const ma = movingAverage(series, windowDays);
      const last = ma[ma.length - 1] || 0;
      predictedRemaining = last * (monthEnd.getDate() - today.getDate());
    } else if (algorithm === 'weighted') {
      const weights = Array.from({ length: Math.min(windowDays, series.length) }, (_, i) => i + 1);
      const wma = weightedMovingAverage(series, weights);
      const last = wma[wma.length - 1] || 0;
      predictedRemaining = last * (monthEnd.getDate() - today.getDate());
    } else {
      const preds = linearTrendPredict(series, (monthEnd.getDate() - today.getDate()));
      predictedRemaining = preds.reduce((s, v) => s + Math.max(0, v), 0);
    }

    const spentSoFar = series.reduce((s, v) => s + v, 0);
    const predictedTotal = spentSoFar + predictedRemaining;
    results.push({ category: cat, spentSoFar: Number(spentSoFar.toFixed(2)), predictedRemaining: Number(predictedRemaining.toFixed(2)), predictedTotal: Number(predictedTotal.toFixed(2)) });
  }

  return { monthStart: monthStart.toISOString(), monthEnd: monthEnd.toISOString(), categories: results };
}

/**
 * Budget risk: compare predictedTotal per category vs budgets
 */
async function predictBudgetRisk(userId, options = {}) {
  const byCategory = await predictByCategory(userId, options);
  const budgets = await prisma.budget.findMany({ where: { userId } });
  const risks = [];
  for (const b of budgets) {
    const catPred = byCategory.categories.find(c => c.category === b.category);
    if (!catPred) continue;
    const utilization = b.monthlyLimit > 0 ? (catPred.predictedTotal / Number(b.monthlyLimit)) * 100 : null;
    risks.push({ category: b.category, monthlyLimit: Number(b.monthlyLimit), predictedTotal: catPred.predictedTotal, utilization: utilization === null ? null : Number(utilization.toFixed(2)), willExceed: utilization !== null ? utilization > 100 : false });
  }
  return { monthStart: byCategory.monthStart, monthEnd: byCategory.monthEnd, risks };
}

/**
 * Cashflow forecasting: predict daily net cash flow for next N days based on recent history
 */
async function predictCashflow(userId, days = 30) {
  // fetch past 90 days of income and expenses, compute average daily net and project forward
  const pastDays = 90;
  const end = new Date(); end.setHours(23,59,59,999);
  const start = new Date(); start.setDate(start.getDate() - pastDays); start.setHours(0,0,0,0);
  const txs = await prisma.transaction.findMany({ where: { userId, date: { gte: start, lte: end } }, orderBy: { date: 'asc' } });
  const map = new Map();
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) map.set(new Date(d).toISOString(), 0);
  for (const t of txs) {
    const k = new Date(t.date); k.setHours(0,0,0,0);
    const key = k.toISOString();
    const sign = t.type === 'INCOME' ? 1 : -1;
    map.set(key, (map.get(key) || 0) + sign * Number(t.amount));
  }
  const dailyNet = Array.from(map.values());
  const avgDailyNet = dailyNet.reduce((s, v) => s + v, 0) / (dailyNet.length || 1);

  // project next N days using avgDailyNet and linear trend
  const forecast = [];
  for (let i = 1; i <= days; i++) {
    const date = new Date(); date.setDate(date.getDate() + i);
    const predicted = Number((avgDailyNet).toFixed(2));
    forecast.push({ date: date.toISOString(), predictedNet: predicted });
  }

  // simple savings projection for month: current savings + projected net
  // compute current month savings so far
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyTotals = await prisma.transaction.groupBy({ by: ['type'], where: { userId, date: { gte: monthStart, lte: end } }, _sum: { amount: true } });
  const income = Number(monthlyTotals.find((row) => row.type === 'INCOME')?._sum.amount || 0);
  const expenses = Number(monthlyTotals.find((row) => row.type === 'EXPENSE')?._sum.amount || 0);
  const currentSavings = income - expenses;

  const projectedNetNext30 = forecast.reduce((s, f) => s + f.predictedNet, 0);
  const projectedSavings = Number((currentSavings + projectedNetNext30).toFixed(2));

  return { forecast, avgDailyNet: Number(avgDailyNet.toFixed(2)), projectedSavings };
}

module.exports = {
  movingAverage,
  weightedMovingAverage,
  linearTrendPredict,
  predictMonthEnd,
  predictByCategory,
  predictBudgetRisk,
  predictCashflow,
};
