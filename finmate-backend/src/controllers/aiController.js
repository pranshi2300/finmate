const { z } = require('zod');
const { askFinancialAdvisor } = require('../services/ai/financialAdvisor');
const logger = require('../utils/logger');

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1000, 'Message is too long'),
  conversationHistory: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) })).max(20).optional().default([]),
});

async function chat(req, res) {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
  logger.info('AI advisor request received', { userId: req.user.id, conversationLength: parsed.data.conversationHistory.length });
  res.json(await askFinancialAdvisor(req.user.id, parsed.data.message, parsed.data.conversationHistory));
}

module.exports = { chat };
