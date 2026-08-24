export default function CashflowCard({ data }) {
  return (
    <div className="rounded-xl border border-hairline p-4">
      <p className="font-mono text-xs text-bone/65 uppercase">Cashflow (30d)</p>
      <p className="font-display text-xl">{data?.projectedSavings?.toFixed(2) ?? '—'}</p>
      <p className="text-sm text-bone/65">Avg daily net: {data?.avgDailyNet}</p>
    </div>
  );
}
