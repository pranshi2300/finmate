import { formatMoney } from "../utils/format";

export default function SettlementPanel({ balances, transactions, currentUserId }) {
  return (
    <div className="border border-hairline rounded-xl p-5 card-surface">
      <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-4">Balances</p>
      <div className="space-y-2">
        {balances.map((b) => (
          <div key={b.userId} className="flex items-center justify-between">
            <span className="font-body text-bone text-sm">
              {b.name} {b.userId === currentUserId && <span className="text-bone/65">(you)</span>}
            </span>
            <span
              className={`font-mono text-sm ${
                b.balance > 0.01 ? "text-ledger-light" : b.balance < -0.01 ? "text-signal" : "text-bone/65"
              }`}
            >
              {b.balance > 0.01 ? `+${formatMoney(b.balance)}` : formatMoney(b.balance)}
            </span>
          </div>
        ))}
      </div>

      <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mt-6 mb-4">Settle up</p>
      {transactions.length === 0 ? (
        <p className="font-body text-bone/65 text-sm">Everyone's settled up — nothing owed.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((t, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-signal/10 border border-signal/30 rounded-xl px-3 py-2"
            >
              <span className="font-body text-bone text-sm">
                {t.fromName} <span className="text-bone/65">pays</span> {t.toName}
              </span>
              <span className="font-mono text-signal text-sm">{formatMoney(t.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="font-body text-bone/65 text-xs mt-3">
        This is the minimum number of payments needed to settle every debt in the group.
      </p>
    </div>
  );
}
