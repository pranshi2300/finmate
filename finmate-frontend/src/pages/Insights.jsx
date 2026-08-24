import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';

const InsightsDashboard = lazy(() => import('../components/InsightsDashboard'));
const PredictionDashboard = lazy(() => import('../components/PredictionDashboard'));

export default function Insights() {
  return (
    <main className="min-h-screen bg-app relative p-6">
      <header className="mb-6">
        <p className="font-mono text-xs text-ledger-light uppercase">Analytics</p>
        <h1 className="font-display text-3xl text-bone mt-2">Insights & Forecasts</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="card-surface p-4">Loading insights…</div>}>
          <InsightsDashboard />
          <PredictionDashboard />
        </Suspense>
      </div>

      <div className="mt-6">
        <Link to="/" className="text-sm text-bone/75">Back to dashboard</Link>
      </div>
    </main>
  );
}
