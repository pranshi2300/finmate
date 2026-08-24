import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import SpendingChart from './SpendingChart';
import CategoryPieChart from './CategoryPieChart';
import RecommendationCard from './RecommendationCard';
import InteractiveCategoryExplorer from './InteractiveCategoryExplorer';

export default function InsightsDashboard() {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [categories, setCategories] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [months, setMonths] = useState(6);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('spend');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = { months };
        const [s, t, c, a, m, sub, r] = await Promise.all([
          api.get('/insights/summary'), api.get('/insights/spending-trends'), api.get('/insights/category-analysis', { params }),
          api.get('/insights/analytics', { params }), api.get('/insights/merchant-analytics', { params }),
          api.get('/insights/subscriptions', { params }), api.get('/insights/recommendations'),
        ]);
        setSummary(s.data.summary); setTrends(t.data); setCategories(c.data.categories || []); setAnalytics(a.data);
        setMerchants(m.data.ranking || []); setSubscriptions(sub.data.subscriptions || []); setRecommendations(r.data.recommendations || []);
      } catch (error) {
        console.error('Failed to load insights', error);
      } finally { setLoading(false); }
    }
    load();
  }, [months]);

  const visibleMerchants = useMemo(() => merchants
    .filter((merchant) => merchant.merchant.includes(search.trim().toLowerCase()))
    .sort((a, b) => sort === 'frequency' ? b.transactionCount - a.transactionCount : b.totalSpend - a.totalSpend), [merchants, search, sort]);

  if (loading) return <section className="border border-hairline rounded-xl p-5 card-surface">Loading AI insights…</section>;

  return (
    <section className="border border-hairline rounded-xl p-5 card-surface">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
        <div><p className="font-mono text-sm text-bone/65 uppercase tracking-wide">AI Insights</p><h2 className="font-display text-bone text-2xl">Personalized financial insights</h2></div>
        <label className="font-mono text-xs text-bone/65">Period
          <select value={months} onChange={(event) => setMonths(Number(event.target.value))} className="ml-2 bg-ink/80 border border-hairline rounded px-2 py-1 text-bone">
            <option value={3}>3 months</option><option value={6}>6 months</option><option value={12}>12 months</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[['Income (month)', summary?.income], ['Expenses (month)', summary?.expenses], ['Savings', summary?.savings]].map(([label, value]) => <div key={label} className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase">{label}</p><p className="font-display text-xl">{value?.toFixed(2) ?? '—'}</p></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase mb-3">Weekly trends</p>{trends?.weekly && <SpendingChart weekly={trends.weekly} />}</div>
        <div className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase mb-3">Category breakdown</p>{categories.length ? <CategoryPieChart categories={categories.slice(0, 6)} onSliceClick={setSelectedCategory} /> : <p className="text-bone/65">No category data yet</p>}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Metric label="Expense ratio" value={analytics?.expenseRatio?.currentRatio === null ? 'No income' : `${analytics?.expenseRatio?.currentRatio ?? '—'}%`} />
        <Metric label="Spending volatility" value={`${analytics?.spendingVolatility?.volatilityScore ?? '—'}%`} />
        <Metric label="Average expense" value={analytics?.transactionSize?.averageTransactionAmount?.toFixed(2) ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase mb-3">Merchant analytics</p>
          <div className="flex gap-2 mb-3"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search merchant" className="min-w-0 flex-1 bg-ink/80 border border-hairline rounded px-2 py-1 text-sm text-bone" /><select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-ink/80 border border-hairline rounded text-sm text-bone"><option value="spend">Spend</option><option value="frequency">Frequency</option></select></div>
          <div className="space-y-2">{visibleMerchants.slice(0, 5).map((merchant) => <div key={merchant.merchant} className="flex justify-between gap-3 text-sm"><span className="text-bone capitalize truncate">{merchant.merchant}</span><span className="font-mono text-bone/65 whitespace-nowrap">{merchant.transactionCount}× · {merchant.totalSpend.toFixed(2)}</span></div>)}{!visibleMerchants.length && <p className="text-sm text-bone/65">No receipt merchants found.</p>}</div>
        </div>
        <div className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase mb-3">Detected subscriptions</p><div className="space-y-2">{subscriptions.slice(0, 5).map((subscription) => <div key={subscription.merchant} className="flex justify-between gap-3 text-sm"><span className="text-bone capitalize">{subscription.merchant}</span><span className="font-mono text-bone/65">{subscription.averageAmount.toFixed(2)} · {subscription.confidence}%</span></div>)}{!subscriptions.length && <p className="text-sm text-bone/65">No recurring subscriptions detected yet.</p>}</div></div>
      </div>

      {selectedCategory && <div className="mb-6 border border-hairline rounded-xl p-4"><InteractiveCategoryExplorer initialCategory={selectedCategory} /></div>}
      <div><p className="font-mono text-xs text-bone/65 uppercase mb-3">Smart recommendations</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{recommendations.map((item, index) => <RecommendationCard key={`${item.title}-${index}`} recommendation={item} />)}</div></div>
    </section>
  );
}

function Metric({ label, value }) { return <div className="border border-hairline rounded-xl p-4"><p className="font-mono text-xs text-bone/65 uppercase">{label}</p><p className="font-display text-xl">{value}</p></div>; }
