export default function BudgetRiskCard({ risk }) {
  const { category, monthlyLimit, predictedTotal, utilization, willExceed } = risk;
  return (
    <div className={`rounded-xl p-3 border ${willExceed ? 'border-signal bg-signal/10' : 'border-hairline bg-ink/80'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-body text-sm text-bone">{category}</p>
          <p className="font-mono text-xs text-bone/65">Limit: {monthlyLimit.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-sm">{predictedTotal.toFixed(2)}</p>
          <p className="text-xs text-bone/65">{utilization}%</p>
        </div>
      </div>
    </div>
  );
}
