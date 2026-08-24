const {
  getSummary,
  getSpendingTrends,
  getCategoryAnalysis,
  getSpendingAnomalies,
} = require('../services/insightsService');
const {
  getSpendingByWeekday,
  getSpendingByHour,
  getMonthlyIncomeTrend,
  getMonthlySavingsTrend,
  getExpenseToIncomeRatio,
  getCategoryGrowthDetails,
  getTransactionSizeStats,
  getSpendingVolatility,
} = require('../services/analyticsService');
const { getMerchantAnalytics } = require('../services/merchantAnalyticsService');
const { detectSubscriptions } = require('../services/subscriptionService');
const { generateRecommendations } = require('../services/recommendationEngine');
const { predictBudgetRisk, predictMonthEnd } = require('../services/budgetPredictionService');

function boundedNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}

async function summary(req, res) {
  const [summaryData, categoryAnalysis, anomalies, trends] = await Promise.all([
    getSummary(req.user.id), getCategoryAnalysis(req.user.id), getSpendingAnomalies(req.user.id), getSpendingTrends(req.user.id),
  ]);
  res.json({ summary: { ...summaryData, monthComparison: trends.monthComparison }, categoryAnalysis, anomalies });
}

async function spendingTrends(req, res) {
  res.json(await getSpendingTrends(req.user.id, boundedNumber(req.query.weeks, 8, 1, 52)));
}

async function categoryAnalysis(req, res) {
  res.json(await getCategoryAnalysis(req.user.id, boundedNumber(req.query.months, 6, 1, 24)));
}

async function analytics(req, res) {
  const months = boundedNumber(req.query.months, 6, 1, 24);
  const days = boundedNumber(req.query.days, 90, 7, 365);
  const [weekday, hour, incomeTrend, savingsTrend, expenseRatio, categoryGrowth, transactionSize, spendingVolatility] = await Promise.all([
    getSpendingByWeekday(req.user.id, days), getSpendingByHour(req.user.id, days), getMonthlyIncomeTrend(req.user.id, months),
    getMonthlySavingsTrend(req.user.id, months), getExpenseToIncomeRatio(req.user.id, months), getCategoryGrowthDetails(req.user.id, months),
    getTransactionSizeStats(req.user.id, months), getSpendingVolatility(req.user.id, days),
  ]);
  res.json({ weekday, hour, incomeTrend, savingsTrend, expenseRatio, categoryGrowth, transactionSize, spendingVolatility });
}

async function merchantAnalytics(req, res) {
  res.json(await getMerchantAnalytics(req.user.id, boundedNumber(req.query.months, 12, 1, 24), boundedNumber(req.query.limit, 10, 1, 25)));
}

async function subscriptions(req, res) {
  res.json(await detectSubscriptions(req.user.id, boundedNumber(req.query.months, 12, 3, 24)));
}

async function recommendations(req, res) {
  const userId = req.user.id;
  const [summaryData, anomalies, budgetRisks, monthEndForecast, merchantData, subscriptionData, analyticsData] = await Promise.all([
    getSummary(userId), getSpendingAnomalies(userId), predictBudgetRisk(userId), predictMonthEnd(userId),
    getMerchantAnalytics(userId), detectSubscriptions(userId),
    Promise.all([getMonthlyIncomeTrend(userId), getMonthlySavingsTrend(userId), getSpendingVolatility(userId)]).then(([incomeTrend, savingsTrend, spendingVolatility]) => ({ incomeTrend, savingsTrend, spendingVolatility })),
  ]);
  res.json({ recommendations: generateRecommendations(userId, {
    summary: summaryData, anomalies, budgetRisks, monthEndForecast, merchantAnalytics: merchantData,
    subscriptions: subscriptionData, analytics: analyticsData,
  }) });
}

module.exports = { summary, spendingTrends, categoryAnalysis, analytics, merchantAnalytics, subscriptions, recommendations };
