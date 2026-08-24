const { formatNotification } = require('./notificationFormatter');
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function notificationRules(context, dateKey = new Date().toISOString().slice(0, 10)) {
  const notifications = [];
  for (const risk of context.predictions?.budgetRisks?.risks || []) {
    if (risk.utilization >= 100) notifications.push(formatNotification({ title: `${risk.category} budget exceeded`, description: `Forecast spending is ${money(risk.predictedTotal)} against a ${money(risk.monthlyLimit)} limit.`, priority: 'critical', type: 'budget', action: { type: 'view-category', payload: { category: risk.category } }, dedupeKey: `budget-exceeded:${risk.category}:${dateKey}` }));
    else if (risk.utilization >= 90) notifications.push(formatNotification({ title: `${risk.category} budget nearly exhausted`, description: `${Math.round(risk.utilization)}% of your budget is forecast to be used.`, priority: 'high', type: 'budget', action: { type: 'view-category', payload: { category: risk.category } }, dedupeKey: `budget-warning:${risk.category}:${dateKey}` }));
    else if (risk.willExceed) notifications.push(formatNotification({ title: `${risk.category} spending may exceed budget`, description: `Your forecast is ${money(risk.predictedTotal)} this month.`, priority: 'high', type: 'forecast', action: { type: 'open-forecast' }, dedupeKey: `budget-forecast:${risk.category}:${dateKey}` }));
  }
  if (context.anomalies?.anomalies?.length) notifications.push(formatNotification({ title: 'Unusual spending detected', description: `${context.anomalies.anomalies.length} transaction${context.anomalies.anomalies.length === 1 ? '' : 's'} exceeded your normal range.`, priority: 'high', type: 'spending', action: { type: 'view-anomalies' }, dedupeKey: `anomaly:${dateKey}` }));
  if (context.monthly?.highestExpense && Number(context.monthly.highestExpense.amount) > Number(context.monthly.avgDaily || 0) * 10) notifications.push(formatNotification({ title: 'Large transaction detected', description: `${money(context.monthly.highestExpense.amount)} in ${context.monthly.highestExpense.category} is unusually large compared with your daily spending.`, priority: 'high', type: 'spending', action: { type: 'view-transaction', payload: { id: context.monthly.highestExpense.id } }, dedupeKey: `large-transaction:${context.monthly.highestExpense.id}` }));
  const dueSoon = (context.subscriptions?.subscriptions || []).filter((item) => { const days = (new Date(item.nextExpectedPayment) - new Date()) / 86400000; return days >= 0 && days <= 3; });
  dueSoon.forEach((item) => notifications.push(formatNotification({ title: `${item.merchant} payment due soon`, description: `An estimated ${money(item.averageAmount)} recurring payment is due within three days.`, priority: 'medium', type: 'subscription', action: { type: 'view-subscription', payload: { merchant: item.merchant } }, dedupeKey: `subscription:${item.merchant}:${dateKey}` })));
  if (context.predictions?.cashflow?.projectedSavings >= Math.max(1000, Number(context.monthly?.income || 0) * 0.2)) notifications.push(formatNotification({ title: 'Savings milestone on track', description: `You are projected to save ${money(context.predictions.cashflow.projectedSavings)}.`, priority: 'low', type: 'achievement', action: { type: 'open-savings' }, dedupeKey: `savings-milestone:${dateKey.slice(0, 7)}` }));
  for (const recommendation of (context.recommendations || []).filter((item) => item.confidence >= 80).slice(0, 2)) notifications.push(formatNotification({ title: recommendation.title, description: recommendation.description, priority: recommendation.priority, type: 'aiAdvisor', action: recommendation.action, dedupeKey: `advisor:${recommendation.id}:${dateKey}` }));
  if (new Date(`${dateKey}T00:00:00.000Z`).getUTCDate() <= 3) notifications.push(formatNotification({ title: 'Monthly financial summary is ready', description: `Last month is complete. Review this month’s income, expenses, and savings trend.`, priority: 'low', type: 'summary', action: { type: 'open-insights' }, dedupeKey: `monthly-summary:${dateKey.slice(0, 7)}` }));
  return notifications;
}

const TYPE_PREFERENCE = { budget: 'budget', forecast: 'forecasts', subscription: 'subscriptions', achievement: 'achievements', aiAdvisor: 'aiAdvisor', summary: 'savings', spending: 'budget' };
function applyPreferences(notifications, preferences) { if (!preferences?.enabled) return []; return notifications.filter((item) => preferences[TYPE_PREFERENCE[item.type]] !== false); }

module.exports = { notificationRules, applyPreferences };
