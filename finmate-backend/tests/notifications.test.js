const assert = require('assert');
const { notificationRules, applyPreferences } = require('../src/services/notifications/notificationRules');
const context = {
  monthly: { income: 10000, avgDaily: 100, highestExpense: { id: 'tx-1', amount: 3000, category: 'Shopping' } },
  predictions: { budgetRisks: { risks: [{ category: 'Food', utilization: 110, predictedTotal: 5500, monthlyLimit: 5000, willExceed: true }] }, cashflow: { projectedSavings: 3000 } },
  anomalies: { anomalies: [{ id: 'a-1' }] }, subscriptions: { subscriptions: [{ merchant: 'music', averageAmount: 199, nextExpectedPayment: new Date(Date.now() + 86400000).toISOString() }] },
  recommendations: [{ id: 'rec-1', title: 'Review music', description: 'Recurring payment', priority: 'medium', type: 'subscription', action: { type: 'view-subscription' }, confidence: 90 }],
};
const generated = notificationRules(context, '2026-07-22');
assert(generated.some((item) => item.type === 'budget' && item.priority === 'critical'));
assert(generated.some((item) => item.type === 'subscription'));
assert(generated.some((item) => item.type === 'aiAdvisor'));
assert.strictEqual(applyPreferences(generated, { enabled: false }).length, 0);
assert(!applyPreferences(generated, { enabled: true, budget: false }).some((item) => item.type === 'budget'));
console.log('notification rule tests passed');
