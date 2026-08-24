const assert = require('assert');
const advisorPath = require.resolve('../src/services/ai/financialAdvisor');
require.cache[advisorPath] = { id: advisorPath, filename: advisorPath, loaded: true, exports: { askFinancialAdvisor: async (userId, message, history) => ({ reply: `${userId}:${message}`, suggestions: [], confidence: 90, sources: { analytics: [], recommendationIds: [], forecasts: [], budgets: [], historyLength: history.length } }) } };
const { chat } = require('../src/controllers/aiController');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

(async () => {
  const validResponse = response();
  await chat({ user: { id: 'user-1' }, body: { message: 'How much did I spend?', conversationHistory: [{ role: 'user', content: 'hello' }] } }, validResponse);
  assert.strictEqual(validResponse.statusCode, 200);
  assert.strictEqual(validResponse.body.reply, 'user-1:How much did I spend?');

  const invalidResponse = response();
  await chat({ user: { id: 'user-1' }, body: { message: '' } }, invalidResponse);
  assert.strictEqual(invalidResponse.statusCode, 400);
  console.log('ai controller tests passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });
