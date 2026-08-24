const prisma = require("../config/db");
const { transactionSchema, transactionUpdateSchema } = require("../utils/validation");

// GET /api/transactions?page=1&limit=20&type=EXPENSE&category=Food
async function list(req, res) {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // cap to prevent abuse
  const { type, category } = req.query;

  const where = {
    userId: req.user.id,
    ...(type && { type }),
    ...(category && { category }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// GET /api/transactions/summary — totals for the dashboard cards
async function summary(req, res) {
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId: req.user.id },
    _sum: { amount: true },
  });

  const income = grouped.find((g) => g.type === "INCOME")?._sum.amount || 0;
  const expenses = grouped.find((g) => g.type === "EXPENSE")?._sum.amount || 0;

  res.json({
    totalIncome: Number(income),
    totalExpenses: Number(expenses),
    balance: Number(income) - Number(expenses),
  });
}

async function create(req, res) {
  const parsed = transactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const transaction = await prisma.transaction.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), userId: req.user.id },
  });

  res.status(201).json({ transaction });
}

async function update(req, res) {
  const parsed = transactionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  // Ownership check first — a user must never be able to edit someone else's
  // transaction just by guessing an id.
  const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  const data = { ...parsed.data };
  if (data.date) data.date = new Date(data.date);

  const transaction = await prisma.transaction.update({
    where: { id: req.params.id },
    data,
  });

  res.json({ transaction });
}

async function remove(req, res) {
  const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
  if (!existing || existing.userId !== req.user.id) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  await prisma.transaction.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { list, summary, create, update, remove };
