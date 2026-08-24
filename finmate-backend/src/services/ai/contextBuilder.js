const prisma = require('../../config/db');
const { getSummary, getCategoryAnalysis, getSpendingTrends, getSpendingAnomalies } = require('../insightsService');
const { getMonthlyIncomeTrend, getMonthlySavingsTrend, getExpenseToIncomeRatio, getSpendingVolatility } = require('../analyticsService');
const { getMerchantAnalytics } = require('../merchantAnalyticsService');
const { detectSubscriptions } = require('../subscriptionService');
const { predictMonthEnd, predictBudgetRisk, predictCashflow } = require('../budgetPredictionService');
const { generateRecommendations } = require('../recommendationEngine');

async function buildFinancialContext(userId) {
  const [totals, summary, categoryAnalysis, spendingTrends, anomalies, budgets, predictions, merchantAnalytics, subscriptions, incomeTrend, savingsTrend, expenseRatio, spendingVolatility, recentTransactions] = await Promise.all([
    prisma.transaction.groupBy({ by: ['type'], where: { userId }, _sum: { amount: true } }),
    getSummary(userId), getCategoryAnalysis(userId), getSpendingTrends(userId), getSpendingAnomalies(userId),
    prisma.budget.findMany({ where: { userId }, orderBy: { category: 'asc' } }),
    Promise.all([predictMonthEnd(userId), predictBudgetRisk(userId), predictCashflow(userId)]),
    getMerchantAnalytics(userId), detectSubscriptions(userId), getMonthlyIncomeTrend(userId), getMonthlySavingsTrend(userId),
    getExpenseToIncomeRatio(userId), getSpendingVolatility(userId),
    prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 10, select: { amount: true, category: true, type: true, note: true, date: true } }),
  ]);

  const totalIncome = Number(totals.find((row) => row.type === 'INCOME')?._sum.amount || 0);
  const totalExpenses = Number(totals.find((row) => row.type === 'EXPENSE')?._sum.amount || 0);
  const [monthEnd, budgetRisks, cashflow] = predictions;
  const analytics = { incomeTrend, savingsTrend, expenseRatio, spendingVolatility, spendingTrends, categoryAnalysis };
  const recommendations = generateRecommendations(userId, {
    summary, anomalies, budgetRisks, monthEndForecast: monthEnd, merchantAnalytics, subscriptions, analytics,
  }).map((item, index) => ({ ...item, id: `rec-${index + 1}` }));

  return {
    generatedAt: new Date().toISOString(),
    balance: totalIncome - totalExpenses,
    lifetime: { income: totalIncome, expenses: totalExpenses },
    monthly: summary,
    budgets: budgets.map((budget) => ({ ...budget, monthlyLimit: Number(budget.monthlyLimit) })),
    predictions: { monthEnd, budgetRisks, cashflow },
    merchantAnalytics,
    subscriptions,
    recentTransactions: recentTransactions.map((transaction) => ({ ...transaction, amount: Number(transaction.amount) })),
    insights: { categoryAnalysis, spendingTrends },
    recommendations,
    anomalies,
    riskScores: { budgetRisks: budgetRisks.risks, expenseRatio: expenseRatio.currentRatio, volatility: spendingVolatility.volatilityScore },
    analytics,
  };
}

module.exports = { buildFinancialContext };
