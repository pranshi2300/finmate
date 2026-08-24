const assert = require('assert');
const { normalizeMerchantName, mean, stdDev } = require('../src/services/analyticsHelpers');
const { groupByMerchant, buildMerchantTrend } = require('../src/services/merchantAnalyticsService');
const { findRecurringPatterns } = require('../src/services/subscriptionService');
const { generateRecommendations } = require('../src/services/recommendationEngine');
const analyticsService = require('../src/services/analyticsService');
const prisma = require('../src/config/db');

assert.strictEqual(normalizeMerchantName(' ACME MART #42 '), 'acme 42');
assert.strictEqual(normalizeMerchantName(''), 'unknown');
assert.strictEqual(mean([]), 0);
assert.strictEqual(stdDev([]), 0);

const grouped = groupByMerchant([
  { merchant: 'coffee', amount: 100, date: new Date('2026-05-01') },
  { merchant: 'coffee', amount: 120, date: new Date('2026-06-01') },
  { merchant: 'books', amount: 200, date: new Date('2026-06-02') },
]);
assert.strictEqual(grouped.find((entry) => entry.merchant === 'coffee').count, 2);
assert.strictEqual(buildMerchantTrend([], 3).length, 3);
const largeMerchantSet = groupByMerchant(Array.from({ length: 500 }, (_, index) => ({
  merchant: `merchant-${index % 10}`, amount: index + 1, date: new Date('2026-06-01'),
})));
assert.strictEqual(largeMerchantSet.length, 10);

const recurring = findRecurringPatterns({ merchant: 'music', entries: [
  { amount: 199, date: '2026-01-01' }, { amount: 200, date: '2026-02-01' }, { amount: 201, date: '2026-03-01' },
] });
assert(recurring && recurring.confidence >= 60);
assert.strictEqual(findRecurringPatterns({ merchant: 'one-off', entries: [{ amount: 10, date: '2026-01-01' }] }), null);

const recommendations = generateRecommendations('empty-user', {
  summary: { income: 1000 }, budgetRisks: { risks: [] }, subscriptions: { subscriptions: [] }, merchantAnalytics: { ranking: [] },
  analytics: { incomeTrend: { values: [] }, savingsTrend: { values: [] }, spendingVolatility: { volatilityScore: 0 } }, anomalies: { anomalies: [] },
});
assert.strictEqual(recommendations.length, 1);
assert.strictEqual(typeof recommendations[0].confidence, 'number');

const forecastRecommendations = generateRecommendations('forecast-user', {
  summary: { income: 1000 }, monthEndForecast: { predictedTotal: 1500 }, budgetRisks: { risks: [] },
  subscriptions: { subscriptions: [] }, merchantAnalytics: { ranking: [] }, anomalies: { anomalies: [] },
  analytics: { incomeTrend: { values: [1000, 900] }, savingsTrend: { values: [300, 100] }, spendingVolatility: { volatilityScore: 120 } },
});
assert(forecastRecommendations.some((item) => item.category === 'forecast'));

async function verifyAnalyticsService() {
  const originalFindMany = prisma.transaction.findMany;
  prisma.transaction.findMany = async () => [
    { type: 'INCOME', amount: 1000, date: new Date() },
    { type: 'EXPENSE', amount: 250, date: new Date() },
  ];
  try {
    const incomeTrend = await analyticsService.getMonthlyIncomeTrend('test-user', 3);
    const savingsTrend = await analyticsService.getMonthlySavingsTrend('test-user', 3);
    const volatility = await analyticsService.getSpendingVolatility('test-user', 7);
    assert.strictEqual(incomeTrend.values.length, 3);
    assert.strictEqual(savingsTrend.values.length, 3);
    assert(volatility.volatilityScore >= 0);
  } finally {
    prisma.transaction.findMany = originalFindMany;
  }
  console.log('phase9 service tests passed');
}

verifyAnalyticsService().catch((error) => { console.error(error); process.exitCode = 1; });
