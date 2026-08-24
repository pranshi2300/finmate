function buildAdvisorPrompt({ message, conversationHistory = [], context }) {
  return {
    system: 'You are FinMate, a careful financial advisor. Use only the supplied financial context and never invent figures.',
    message: String(message || '').trim(),
    history: Array.isArray(conversationHistory) ? conversationHistory.slice(-10) : [],
    context,
  };
}

module.exports = { buildAdvisorPrompt };
