const prisma = require("../config/db");
const { createGroupSchema, addGroupExpenseSchema } = require("../utils/validation");
const { computeSettlement } = require("../utils/settlement");

// Shared guard: confirms req.user is actually a member of :id before
// letting them see or modify anything in the group. Without this, any
// logged-in user could read or add expenses to any group by guessing an id.
async function assertMembership(groupId, userId) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  return !!membership;
}

// Shared helper: computes each member's net balance for a group
// (total they paid minus total they owe across all expenses).
async function computeBalances(groupId) {
  const members = await prisma.groupMember.findMany({
    where: { groupId },
    include: { user: { select: { id: true, name: true } } },
  });
  const expenses = await prisma.groupExpense.findMany({
    where: { groupId },
    include: { shares: true },
  });

  const balances = members.map((m) => ({ userId: m.userId, name: m.user.name, balance: 0 }));
  const byId = Object.fromEntries(balances.map((b) => [b.userId, b]));

  for (const expense of expenses) {
    if (byId[expense.paidById]) byId[expense.paidById].balance += Number(expense.amount);
    for (const share of expense.shares) {
      if (byId[share.userId]) byId[share.userId].balance -= Number(share.shareAmount);
    }
  }

  for (const b of balances) b.balance = Math.round(b.balance * 100) / 100;
  return balances;
}

// POST /api/groups
async function createGroup(req, res) {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { name, memberEmails } = parsed.data;

  // Look up which of the invited emails belong to real accounts.
  const invitedUsersRaw = memberEmails.length
    ? await prisma.user.findMany({ where: { email: { in: memberEmails } } })
    : [];

  // The creator is added to the group automatically — if they typed their
  // own email as an "invite", that's not a second member, just a no-op.
  // Without filtering this out, memberIds (a Set) would silently collapse
  // to size 1 and create a solo group despite validation passing.
  const selfInvited = invitedUsersRaw.some((u) => u.id === req.user.id);
  const invitedUsers = invitedUsersRaw.filter((u) => u.id !== req.user.id);

  // Emails that don't match a user are reported back rather than failing
  // the whole request — we don't want to block group creation over one
  // typo'd email among several valid ones.
  const notFound = memberEmails.filter(
    (email) => !invitedUsersRaw.some((u) => u.email === email)
  );

  if (invitedUsers.length === 0) {
    const reasons = [];
    if (notFound.length) {
      reasons.push(`no FinMate account found for: ${notFound.join(", ")}`);
    }
    if (selfInvited) {
      reasons.push("you're already in the group automatically, so inviting yourself doesn't count as another member");
    }
    return res.status(400).json({
      error: `Couldn't add anyone — ${reasons.join("; and ")}.`,
    });
  }

  const memberIds = new Set([req.user.id, ...invitedUsers.map((u) => u.id)]);

  if (memberIds.size < 2) {
    return res.status(400).json({ error: "A group needs at least one other member besides you." });
  }

  const group = await prisma.group.create({
    data: {
      name,
      createdById: req.user.id,
      members: { create: [...memberIds].map((userId) => ({ userId })) },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });

  res.status(201).json({ group, notFoundEmails: notFound });
}

// GET /api/groups — groups the current user belongs to
async function listGroups(req, res) {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: { _count: { select: { members: true, expenses: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ groups });
}

// GET /api/groups/:id — full detail: members + expenses
async function getGroup(req, res) {
  const isMember = await assertMembership(req.params.id, req.user.id);
  if (!isMember) return res.status(404).json({ error: "Group not found" });

  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      expenses: {
        include: {
          paidBy: { select: { id: true, name: true } },
          shares: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  res.json({ group });
}

// POST /api/groups/:id/expenses — adds an expense, split equally among
// current members. paidBy defaults to the person adding it.
async function addExpense(req, res) {
  const groupId = req.params.id;
  const isMember = await assertMembership(groupId, req.user.id);
  if (!isMember) return res.status(404).json({ error: "Group not found" });

  const parsed = addGroupExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const { description, amount, date } = parsed.data;

  const members = await prisma.groupMember.findMany({ where: { groupId } });
  const shareCount = members.length;
  // Split as evenly as possible, giving any leftover rounding remainder
  // to the first member rather than losing/gaining money to floating point error.
  const baseShare = Math.floor((amount / shareCount) * 100) / 100;
  const remainder = Math.round((amount - baseShare * shareCount) * 100) / 100;

  const expense = await prisma.$transaction(async (tx) => {
    const group = await tx.group.findUnique({ where: { id: groupId }, select: { name: true } });

    const created = await tx.groupExpense.create({
      data: {
        groupId,
        paidById: req.user.id,
        description,
        amount,
        date: date ? new Date(date) : new Date(),
      },
    });

    await tx.groupExpenseShare.createMany({
      data: members.map((m, idx) => ({
        groupExpenseId: created.id,
        userId: m.userId,
        shareAmount: idx === 0 ? baseShare + remainder : baseShare,
      })),
    });

    // Every member's share of a group expense is a real personal cost to
    // them — not just the payer's. Recording the payer's FULL amount would
    // overstate their spending (they'll be reimbursed via settlement), and
    // recording nothing for other members would understate theirs.
    await tx.transaction.createMany({
      data: members.map((m, idx) => ({
        userId: m.userId,
        type: "EXPENSE",
        amount: idx === 0 ? baseShare + remainder : baseShare,
        category: "Group Expense",
        note: `${group.name}: ${description}`.slice(0, 280),
        date: created.date,
        groupExpenseId: created.id,
      })),
    });

    return created;
  });

  res.status(201).json({ expense });
}

// GET /api/groups/:id/balances — net balance per member (paid - owed)
async function getBalances(req, res) {
  const isMember = await assertMembership(req.params.id, req.user.id);
  if (!isMember) return res.status(404).json({ error: "Group not found" });

  const balances = await computeBalances(req.params.id);
  res.json({ balances });
}

// GET /api/groups/:id/settlement — the minimal set of payments to zero everyone out
async function getSettlement(req, res) {
  const isMember = await assertMembership(req.params.id, req.user.id);
  if (!isMember) return res.status(404).json({ error: "Group not found" });

  const balances = await computeBalances(req.params.id);
  const transactions = computeSettlement(balances);
  res.json({ transactions });
}

// DELETE /api/groups/:id — only the creator can delete a group (members can
// leave/be removed in a future step, but wiping shared history should be
// a deliberate, restricted action, not something any member can do).
async function deleteGroup(req, res) {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) return res.status(404).json({ error: "Group not found" });

  if (group.createdById !== req.user.id) {
    return res.status(403).json({ error: "Only the group creator can delete this group" });
  }

  await prisma.group.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { createGroup, listGroups, getGroup, addExpense, getBalances, getSettlement, deleteGroup };
