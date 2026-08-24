const prisma = require("../config/db");
const { budgetSchema } = require("../utils/validation");
const { currentMonthRange } = require("../utils/dateRange");

// GET /api/budgets — every budget, joined with how much has actually been
// spent in that category so far this month.
async function list(req, res) {
  const { start, end } = currentMonthRange();

  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: { userId: req.user.id },
      orderBy: { category: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId: req.user.id,
        type: "EXPENSE",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = Object.fromEntries(
    spentByCategory.map((row) => [row.category, Number(row._sum.amount)])
  );

  const withSpent = budgets.map((b) => {
    const spent = spentMap[b.category] || 0;
    const limit = Number(b.monthlyLimit);
    return {
      ...b,
      monthlyLimit: limit,
      spent,
      percentUsed: limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0,
      overBudget: spent > limit,
    };
  });

  res.json({ budgets: withSpent, periodStart: start, periodEnd: end });
}

// POST /api/budgets — creates a budget, or updates the limit if this
// category already has one (one budget per category per user).
async function upsert(req, res) {
  const parsed = budgetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { category, monthlyLimit } = parsed.data;

  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: req.user.id, category } },
    update: { monthlyLimit },
    create: { userId: req.user.id, category, monthlyLimit },
  });

  res.status(201).json({ budget });
}

async function remove(req, res) {
  const existing = await prisma.budget.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: "Budget not found" });
  }

  await prisma.budget.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, upsert, remove };
