/**
 * Rule-based recommendation generator. It accepts data that controllers have
 * already fetched, keeping database access and response composition separate.
 */
function priorityForUtilization(utilization) {
  if (utilization > 125) return 'critical';
  if (utilization >= 90) return 'high';
  if (utilization >= 75) return 'medium';
  return 'low';
}

function money(amount) {
  return Number(amount || 0).toFixed(2);
}

function recommendation({ title, description, priority, category, action, confidence }) {
  return { title, description, priority, category, action, confidence };
}

function generateRecommendations(_userId, data = {}) {
  const {
    summary,
    anomalies,
    budgetRisks,
    monthEndForecast,
    merchantAnalytics,
    subscriptions,
    analytics,
  } = data;
  const recommendations = [];

  for (const risk of budgetRisks?.risks || []) {
    if (!risk.willExceed && Number(risk.utilization || 0) < 75) continue;
    recommendations.push(recommendation({
      title: `${risk.category} budget is ${risk.willExceed ? 'likely to be exceeded' : 'running high'}`,
      description: `Forecast spending is ₹${money(risk.predictedTotal)} against a ₹${money(risk.monthlyLimit)} limit.`,
      priority: priorityForUtilization(risk.utilization),
      category: risk.category,
      action: { type: 'view-category', payload: { category: risk.category } },
      confidence: risk.willExceed ? 88 : 72,
    }));
  }

  const topMerchant = merchantAnalytics?.ranking?.[0];
  if (topMerchant) {
    recommendations.push(recommendation({
      title: `${topMerchant.merchant} is your top receipt merchant`,
      description: `You recorded ₹${money(topMerchant.totalSpend)} across ${topMerchant.transactionCount} receipt${topMerchant.transactionCount === 1 ? '' : 's'}.`,
      priority: 'medium',
      category: 'merchant',
      action: { type: 'view-merchant', payload: { merchant: topMerchant.merchant } },
      confidence: 82,
    }));
  }

  for (const subscription of (subscriptions?.subscriptions || []).slice(0, 2)) {
    recommendations.push(recommendation({
      title: `Review recurring ${subscription.merchant} payment`,
      description: `About ₹${money(subscription.averageAmount)} is expected every ${subscription.estimatedBillingCycleDays} days; the next payment is estimated for ${new Date(subscription.nextExpectedPayment).toLocaleDateString('en-IN')}.`,
      priority: subscription.averageAmount >= 1000 ? 'high' : 'medium',
      category: 'subscription',
      action: { type: 'view-subscription', payload: { merchant: subscription.merchant } },
      confidence: subscription.confidence,
    }));
  }

  const volatility = analytics?.spendingVolatility?.volatilityScore;
  if (volatility >= 100) {
    recommendations.push(recommendation({
      title: 'Daily spending is volatile',
      description: `Your recent spending volatility is ${volatility}%. A weekly discretionary-spend cap can make cash flow more predictable.`,
      priority: 'medium', category: 'spending', action: { type: 'open-insights' }, confidence: 76,
    }));
  }

  const savings = analytics?.savingsTrend?.values || [];
  if (savings.length >= 2 && savings.at(-1) < savings.at(-2)) {
    recommendations.push(recommendation({
      title: 'Savings are trending down',
      description: `Monthly savings fell from ₹${money(savings.at(-2))} to ₹${money(savings.at(-1))}.`,
      priority: 'high', category: 'savings', action: { type: 'open-savings' }, confidence: 80,
    }));
  }

  const income = analytics?.incomeTrend?.values || [];
  if (income.length >= 2 && income.at(-1) < income.at(-2)) {
    recommendations.push(recommendation({
      title: 'Income is lower than last month',
      description: `Income changed from ₹${money(income.at(-2))} to ₹${money(income.at(-1))}; consider keeping discretionary spend conservative.`,
      priority: 'medium', category: 'income', action: { type: 'open-insights' }, confidence: 72,
    }));
  }

  if (monthEndForecast?.predictedTotal !== undefined && summary?.income > 0) {
    const projectedSavings = summary.income - monthEndForecast.predictedTotal;
    if (projectedSavings < 0) {
      recommendations.push(recommendation({
        title: 'Month-end forecast shows negative savings',
        description: `Projected expenses are ₹${money(monthEndForecast.predictedTotal)}, exceeding this month's income.`,
        priority: 'high', category: 'forecast', action: { type: 'open-forecast' }, confidence: 74,
      }));
    }
  }

  if (anomalies?.anomalies?.length) {
    recommendations.push(recommendation({
      title: 'Unusual transactions detected',
      description: `${anomalies.anomalies.length} expense${anomalies.anomalies.length === 1 ? '' : 's'} exceeded your normal range.`,
      priority: 'high', category: 'security', action: { type: 'view-anomalies' }, confidence: 85,
    }));
  }

  if (!recommendations.length) {
    recommendations.push(recommendation({
      title: 'Your finances look steady', description: 'Add more transactions and receipts to unlock more specific guidance.',
      priority: 'low', category: 'general', action: { type: 'none' }, confidence: 60,
    }));
  }

  return recommendations.sort((a, b) => ({ critical: 4, high: 3, medium: 2, low: 1 }[b.priority] - { critical: 4, high: 3, medium: 2, low: 1 }[a.priority]));
}

module.exports = { generateRecommendations, priorityForUtilization };
