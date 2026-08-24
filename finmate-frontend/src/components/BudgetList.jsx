import { formatMoney } from "../utils/format";

export default function BudgetList({ budgets, loading, onDelete }) {
  if (loading) {
    return <p className="font-mono text-bone/65 text-sm flex items-center gap-2"><span className="spinner text-ledger" />loading budgets…</p>;
  }

  if (!budgets.length) {
    return (
      <p className="font-body text-bone/65 text-sm border border-dashed border-hairline rounded-xl p-6 text-center">
        No budgets set yet — add one to start tracking against a limit.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {budgets.map((b) => (
        <div key={b.id} className="border border-hairline rounded-xl p-4 group card-surface fun-hover">
          <div className="flex items-center justify-between">
            <p className="font-display text-bone text-base">{b.category}</p>
            <div className="flex items-center gap-3">
              <span className={`font-mono text-xs ${b.overBudget ? "text-signal" : "text-bone/75"}`}>
                {formatMoney(b.spent)} / {formatMoney(b.monthlyLimit)}
              </span>
              <button
                onClick={() => onDelete(b.id)}
                aria-label={`Delete ${b.category} budget`}
                className="opacity-0 group-hover:opacity-100 text-bone/75 hover:text-signal text-xs font-mono transition-opacity"
              >
                delete
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 h-1.5 w-full bg-hairline/30 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all animate-fill ${b.overBudget ? "bg-signal" : "bg-ledger"}`}
              style={{ width: `${b.percentUsed}%` }}
            />
          </div>

          {b.overBudget && (
            <p className="font-mono text-signal text-xs mt-1.5">
              Over budget by {formatMoney(b.spent - b.monthlyLimit)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
