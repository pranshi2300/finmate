const {
  predictMonthEnd,
  predictByCategory,
  predictBudgetRisk,
  predictCashflow,
} = require('../services/budgetPredictionService');

function createHttpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function monthEnd(req, res) {
  const userId = req.user.id;
  const algorithm = req.query.algorithm || 'linear';
  const windowDays = Number(req.query.windowDays) || 7;
  const data = await predictMonthEnd(userId, { algorithm, windowDays });
  res.json(data);
}

async function category(req, res) {
  const userId = req.user.id;
  const algorithm = req.query.algorithm || 'linear';
  const windowDays = Number(req.query.windowDays) || 7;
  const data = await predictByCategory(userId, { algorithm, windowDays });
  res.json(data);
}

async function budgetRisk(req, res) {
  const userId = req.user.id;
  const algorithm = req.query.algorithm || 'linear';
  const windowDays = Number(req.query.windowDays) || 7;
  const data = await predictBudgetRisk(userId, { algorithm, windowDays });
  res.json(data);
}

async function cashflow(req, res) {
  const userId = req.user.id;
  const days = Number(req.query.days) || 30;
  const data = await predictCashflow(userId, days);
  res.json(data);
}

module.exports = { monthEnd, category, budgetRisk, cashflow };
