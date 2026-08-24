const ruleBasedProvider = require('./providers/ruleBasedProvider');
const providers = { ruleBased: ruleBasedProvider, gemini: require('./providers/geminiProvider'), openai: require('./providers/openAIProvider'), claude: require('./providers/claudeProvider') };

function getProvider(name = 'ruleBased') {
  // Only the local provider is active in Phase 10. Keeping the provider map
  // here makes a future opt-in integration a one-line adapter change.
  return name === 'ruleBased' ? ruleBasedProvider : ruleBasedProvider;
}

module.exports = { getProvider, providers };
