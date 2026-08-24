import { formatMoney, formatDate } from "../utils/format";

export default function TransactionList({ transactions, loading, onDelete }) {
  if (loading) {
    return <p className="font-mono text-bone/65 text-sm">loading transactions…</p>;
  }

  if (!transactions.length) {
    return (
      <p className="font-body text-bone/65 text-sm border border-dashed border-hairline rounded-md p-6 text-center">
        No transactions yet — add your first one.
      </p>
    );
  }

  return (
    <div className="divide-y divide-hairline border border-hairline rounded-md overflow-hidden">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between px-4 py-3 group">
          <div className="min-w-0">
            <p className="font-display text-bone text-base truncate">{t.category}</p>
            <p className="font-mono text-bone/65 text-xs mt-0.5">
              {formatDate(t.date)} {t.note && `· ${t.note}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`font-mono text-sm ${t.type === "INCOME" ? "text-ledger-light" : "text-signal"}`}
            >
              {t.type === "INCOME" ? "+" : "−"}
              {formatMoney(t.amount)}
            </span>
            <button
              onClick={() => onDelete(t.id)}
              aria-label={`Delete ${t.category} transaction`}
              className="opacity-0 group-hover:opacity-100 text-bone/75 hover:text-signal text-xs font-mono transition-opacity"
            >
              delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
