const { buildFinancialContext } = require('./contextBuilder');
const { buildAdvisorPrompt } = require('./promptBuilder');
const { getProvider } = require('./llmAdapter');

async function askFinancialAdvisor(userId, message, conversationHistory) {
  const context = await buildFinancialContext(userId);
  const prompt = buildAdvisorPrompt({ message, conversationHistory, context });
  return getProvider().answer(prompt);
}

module.exports = { askFinancialAdvisor };
