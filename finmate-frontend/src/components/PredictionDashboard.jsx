import { useEffect, useState } from 'react';
import api from '../api/axios';
import ForecastChart from './ForecastChart';
import BudgetRiskCard from './BudgetRiskCard';
import CashflowCard from './CashflowCard';

export default function PredictionDashboard() {
  const [monthPrediction, setMonthPrediction] = useState(null);
  const [byCategory, setByCategory] = useState(null);
  const [budgetRisk, setBudgetRisk] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [m, c, b, cf] = await Promise.all([
          api.get('/predictions/month-end'),
          api.get('/predictions/category'),
          api.get('/predictions/budget-risk'),
          api.get('/predictions/cashflow'),
        ]);
        setMonthPrediction(m.data);
        setByCategory(c.data);
        setBudgetRisk(b.data);
        setCashflow(cf.data);
      } catch (err) {
        console.error('Failed to load predictions', err);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="border border-hairline rounded-xl p-5 card-surface">Loading forecasts…</div>;

  return (
    <section className="border border-hairline rounded-xl p-5 card-surface">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-mono text-sm text-bone/65 uppercase tracking-wide">Financial forecast</p>
          <h2 className="font-display text-bone text-2xl">Predictions & budget risk</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="border border-hairline rounded-xl p-4">
          <p className="font-mono text-xs text-bone/65 uppercase">Predicted month total</p>
          <p className="font-display text-xl">{monthPrediction?.predictedTotal?.toFixed(2) ?? '—'}</p>
          <p className="text-sm text-bone/60">Spent so far: {monthPrediction?.spentSoFar?.toFixed(2)}</p>
        </div>

        <div className="border border-hairline rounded-xl p-4">
          <p className="font-mono text-xs text-bone/65 uppercase">Predicted remaining</p>
          <p className="font-display text-xl text-signal">{monthPrediction?.predictedRemaining?.toFixed(2) ?? '—'}</p>
          <p className="text-sm text-bone/60">Month: {new Date(monthPrediction?.monthStart).toLocaleDateString()} - {new Date(monthPrediction?.monthEnd).toLocaleDateString()}</p>
        </div>

        <div className="border border-hairline rounded-xl p-4">
          <p className="font-mono text-xs text-bone/65 uppercase">Projected savings (30d)</p>
          <p className="font-display text-xl">{cashflow?.projectedSavings?.toFixed(2) ?? '—'}</p>
          <p className="text-sm text-bone/60">Avg daily net: {cashflow?.avgDailyNet}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-hairline rounded-xl p-4">
          <p className="font-mono text-xs text-bone/65 uppercase mb-3">Forecast</p>
          <ForecastChart dataPoints={cashflow?.forecast || []} />
        </div>

        <div className="space-y-4">
          <div className="border border-hairline rounded-xl p-4">
            <p className="font-mono text-xs text-bone/65 uppercase mb-3">Category predictions</p>
            {byCategory?.categories?.length ? (
              <ul className="space-y-2">
                {byCategory.categories.slice(0,6).map(c => (
                  <li key={c.category} className="flex items-center justify-between">
                    <span className="font-body text-sm text-bone">{c.category}</span>
                    <span className="font-mono text-sm text-bone/65">{Number(c.predictedTotal).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-bone/65">No category history</p>}
          </div>

          <div className="border border-hairline rounded-xl p-4">
            <p className="font-mono text-xs text-bone/65 uppercase mb-3">Budget risk</p>
            {budgetRisk?.risks?.length ? budgetRisk.risks.map(r => (
              <BudgetRiskCard key={r.category} risk={r} />
            )) : <p className="text-bone/65">No budgets set</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
