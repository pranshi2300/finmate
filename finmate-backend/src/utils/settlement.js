// Given each member's net balance in a group (positive = they're owed
// money, negative = they owe money), returns the minimum-ish set of
// transactions that settles all debts.
//
// How it works: repeatedly take whoever is owed the MOST (biggest
// creditor) and whoever owes the MOST (biggest debtor), and settle
// between just those two for as much as possible. One of them hits
// zero and drops out. Repeat. This collapses a group's tangled web of
// "who owes who" into a small number of direct transfers, instead of
// naively having every pair settle individually.
//
// balances: [{ userId, name, balance }]
// returns:  [{ from, fromName, to, toName, amount }]
function computeSettlement(balances) {
  const EPSILON = 0.01; // ignore rounding dust below one paisa

  const creditors = balances
    .filter((b) => b.balance > EPSILON)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < -EPSILON)
    .map((b) => ({ ...b, balance: -b.balance })) // work with positive "amount owed"
    .sort((a, b) => b.balance - a.balance);

  const transactions = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, debtor.balance);

    if (amount > EPSILON) {
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: Math.round(amount * 100) / 100,
      });
    }

    creditor.balance -= amount;
    debtor.balance -= amount;

    if (creditor.balance <= EPSILON) i++;
    if (debtor.balance <= EPSILON) j++;
  }

  return transactions;
}

module.exports = { computeSettlement };
