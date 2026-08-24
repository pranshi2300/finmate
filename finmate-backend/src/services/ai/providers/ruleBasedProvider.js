const { formatAdvisorResponse } = require('../responseFormatter');

const DEFAULT_SUGGESTIONS = ['How can I reduce my expenses?', 'What is my biggest spending category?', 'Can I afford a ₹20,000 laptop?', 'How much can I save next month?', 'Which subscriptions are unnecessary?', 'Explain my forecast.'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const recommendationIds = (context, category) => context.recommendations.filter((item) => !category || item.category === category).map((item) => item.id);

function parsePurchaseAmount(message) {
  const match = String(message).replace(/,/g, '').match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : null;
}

function answer({ message, context }) {
  const lower = String(message).toLowerCase();
  const topCategory = context.monthly.topCategories?.[0];
  const sources = { analytics: [], recommendationIds: [], forecasts: [], budgets: [] };
  let reply;
  let confidence = 78;

  if (/how much.*spend|spent.*month|monthly expense/.test(lower)) {
    reply = `You have spent ${money(context.monthly.expenses)} so far this month.`;
    sources.analytics.push('monthly expenses');
  } else if (/biggest expense|top spending|biggest spending category/.test(lower)) {
    reply = topCategory ? `${topCategory.category} is your largest recent spending category at ${money(topCategory.amount)}.` : 'I need more expense history to identify a largest category.';
    sources.analytics.push('category analysis');
  } else if (/over.?spend|reduce.*expense|save more|improve/.test(lower)) {
    const risk = context.predictions.budgetRisks.risks.find((item) => item.willExceed) || context.predictions.budgetRisks.risks.find((item) => item.utilization >= 75);
    reply = risk ? `Start with ${risk.category}: it is forecast at ${Math.round(risk.utilization)}% of its ${money(risk.monthlyLimit)} budget. Review recurring purchases there before cutting essentials.` : `Your highest recent category is ${topCategory ? `${topCategory.category} at ${money(topCategory.amount)}` : 'not yet available'}. Set a small weekly cap there and review subscriptions.`;
    sources.analytics.push('budget risk', 'category analysis'); sources.budgets.push(...context.predictions.budgetRisks.risks.map((item) => item.category)); sources.recommendationIds.push(...recommendationIds(context));
  } else if (/afford|can i buy|can i purchase/.test(lower)) {
    const amount = parsePurchaseAmount(message);
    if (!amount) { reply = 'Tell me the purchase price (for example, “Can I afford a ₹20,000 laptop?”) and I will compare it with your balance and forecast.'; confidence = 55; }
    else {
      const projectedSavings = context.predictions.cashflow.projectedSavings;
      const affordable = amount <= Math.max(0, context.balance) && projectedSavings >= 0;
      reply = affordable ? `A ${money(amount)} purchase appears affordable: your current balance is ${money(context.balance)} and projected savings are ${money(projectedSavings)}. Keep your budget risks in mind.` : `I would be cautious with a ${money(amount)} purchase. Your balance is ${money(context.balance)} and projected savings are ${money(projectedSavings)}.`;
      sources.analytics.push('current balance'); sources.forecasts.push('cashflow projection', 'month-end forecast'); sources.budgets.push(...context.predictions.budgetRisks.risks.map((item) => item.category));
    }
  } else if (/save.*month|how much.*save|forecast/.test(lower)) {
    reply = `Your projected savings are ${money(context.predictions.cashflow.projectedSavings)}. Month-end expenses are forecast at ${money(context.predictions.monthEnd.predictedTotal)}.`;
    sources.forecasts.push('cashflow projection', 'month-end forecast'); sources.analytics.push('monthly income and expenses');
  } else if (/subscription|cancel/.test(lower)) {
    const items = context.subscriptions.subscriptions.slice(0, 3);
    reply = items.length ? `Review ${items.map((item) => `${item.merchant} (${money(item.averageAmount)})`).join(', ')}. They are recurring patterns, not confirmed contracts, so verify them before cancelling.` : 'I have not found enough consistent recurring payments to flag a subscription yet.';
    sources.analytics.push('subscription detection'); sources.recommendationIds.push(...recommendationIds(context, 'subscription'));
  } else if (/budget.*risk|risky/.test(lower)) {
    const risks = context.predictions.budgetRisks.risks.filter((item) => item.willExceed || item.utilization >= 75);
    reply = risks.length ? `Your highest risks are ${risks.map((item) => `${item.category} at ${Math.round(item.utilization)}%`).join(', ')}.` : 'No current budget is forecast to reach 75% of its limit.';
    sources.analytics.push('budget risk'); sources.budgets.push(...risks.map((item) => item.category)); sources.recommendationIds.push(...recommendationIds(context));
  } else {
    reply = `This month you have income of ${money(context.monthly.income)}, expenses of ${money(context.monthly.expenses)}, and savings of ${money(context.monthly.savings)}. Ask about spending, budgets, subscriptions, a purchase, or your forecast.`;
    sources.analytics.push('monthly summary'); confidence = 70;
  }

  return formatAdvisorResponse({ reply, suggestions: DEFAULT_SUGGESTIONS, confidence, ...sources });
}

module.exports = { name: 'RuleBasedProvider', answer, DEFAULT_SUGGESTIONS };
