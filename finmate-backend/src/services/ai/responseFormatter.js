function formatAdvisorResponse({ reply, suggestions = [], confidence = 60, analytics = [], recommendationIds = [], forecasts = [], budgets = [] }) {
  return {
    reply,
    suggestions,
    confidence: Math.max(0, Math.min(100, Math.round(confidence))),
    sources: {
      analytics,
      recommendationIds,
      forecasts,
      budgets,
    },
  };
}

module.exports = { formatAdvisorResponse };
