const assert = require('assert');
const ruleBasedProvider = require('../src/services/ai/providers/ruleBasedProvider');
const { getProvider, providers } = require('../src/services/ai/llmAdapter');
const { buildAdvisorPrompt } = require('../src/services/ai/promptBuilder');

const context = {
  balance: 50000,
  monthly: { income: 30000, expenses: 12000, savings: 18000, topCategories: [{ category: 'Food', amount: 4500 }] },
  predictions: { monthEnd: { predictedTotal: 16000 }, cashflow: { projectedSavings: 14000 }, budgetRisks: { risks: [{ category: 'Food', monthlyLimit: 5000, predictedTotal: 5500, utilization: 110, willExceed: true }] } },
  subscriptions: { subscriptions: [{ merchant: 'music', averageAmount: 199, estimatedBillingCycleDays: 30, confidence: 93 }] },
  recommendations: [{ id: 'rec-1', category: 'subscription' }, { id: 'rec-2', category: 'Food' }],
};

const spend = ruleBasedProvider.answer({ message: 'How much did I spend this month?', context });
assert.match(spend.reply, /12,000/);
assert(spend.sources.analytics.includes('monthly expenses'));
const afford = ruleBasedProvider.answer({ message: 'Can I afford a ₹20,000 laptop?', context });
assert.match(afford.reply, /affordable/i);
const subscriptions = ruleBasedProvider.answer({ message: 'Which subscriptions should I cancel?', context });
assert.match(subscriptions.reply, /music/);
assert.strictEqual(getProvider(), providers.ruleBased);
assert.strictEqual(providers.gemini.name, 'GeminiProvider');
assert.strictEqual(buildAdvisorPrompt({ message: 'test', conversationHistory: Array(12).fill({ role: 'user', content: 'x' }), context }).history.length, 10);

function mock(modulePath, exports) { require.cache[require.resolve(modulePath)] = { id: modulePath, filename: modulePath, loaded: true, exports }; }
mock('../src/config/db', { transaction: { groupBy: async () => [{ type: 'INCOME', _sum: { amount: 100 } }, { type: 'EXPENSE', _sum: { amount: 40 } }], findMany: async () => [] }, budget: { findMany: async () => [] } });
mock('../src/services/insightsService', { getSummary: async () => ({ income: 50, expenses: 20, savings: 30, topCategories: [] }), getCategoryAnalysis: async () => ({}), getSpendingTrends: async () => ({}), getSpendingAnomalies: async () => ({ anomalies: [] }) });
mock('../src/services/analyticsService', { getMonthlyIncomeTrend: async () => ({ values: [] }), getMonthlySavingsTrend: async () => ({ values: [] }), getExpenseToIncomeRatio: async () => ({ currentRatio: null }), getSpendingVolatility: async () => ({ volatilityScore: 0 }) });
mock('../src/services/merchantAnalyticsService', { getMerchantAnalytics: async () => ({ ranking: [] }) });
mock('../src/services/subscriptionService', { detectSubscriptions: async () => ({ subscriptions: [] }) });
mock('../src/services/budgetPredictionService', { predictMonthEnd: async () => ({}), predictBudgetRisk: async () => ({ risks: [] }), predictCashflow: async () => ({ projectedSavings: 0 }) });

const { buildFinancialContext } = require('../src/services/ai/contextBuilder');
buildFinancialContext('empty-user').then((built) => {
  assert.strictEqual(built.balance, 60);
  assert(Array.isArray(built.recommendations));
  console.log('ai advisor tests passed');
}).catch((error) => { console.error(error); process.exitCode = 1; });
