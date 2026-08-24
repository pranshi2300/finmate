import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';

export default function InteractiveCategoryExplorer({ initialCategory }) {
  const [category, setCategory] = useState(initialCategory || null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    api.get('/transactions', { params: { category } }).then(res => { setTransactions(res.data.transactions || []); setLoading(false); }).catch(() => setLoading(false));
  }, [category]);

  const total = useMemo(() => transactions.reduce((s, t) => s + Number(t.amount), 0), [transactions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-bone">Category explorer</h3>
        <div className="text-sm text-bone/65">Total: {total.toFixed(2)}</div>
      </div>

      <div>
        <input type="text" placeholder="Category" value={category||''} onChange={(e)=>setCategory(e.target.value)} className="w-full bg-ink border border-hairline rounded-xl px-3 py-2 text-bone text-sm" />
      </div>

      <div className="rounded-xl border border-hairline p-3 bg-ink/80">
        {loading ? <div>Loading…</div> : (
          transactions.length ? (
            <ul className="space-y-2">
              {transactions.map(tx => (
                <li key={tx.id} className="flex justify-between text-sm">
                  <span>{new Date(tx.date).toLocaleDateString()} — {tx.category}</span>
                  <span className="font-mono">{Number(tx.amount).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : <div className="text-bone/65">No transactions</div>
        )}
      </div>
    </div>
  );
}
