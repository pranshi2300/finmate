import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AIAdvisor from '../components/AIAdvisor';

export default function AIAdvisorPage() {
  const { user, logout } = useAuth();
  return <div className="min-h-screen bg-app p-6"><header className="max-w-6xl mx-auto mb-6 flex items-center justify-between gap-4"><div className="flex gap-5 items-center"><span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">FinMate AI</span><Link to="/dashboard" className="font-display text-sm text-bone/75 hover:text-signal">Dashboard</Link><Link to="/insights" className="font-display text-sm text-bone/75 hover:text-signal">Insights</Link></div><div className="flex items-center gap-3"><span className="font-body text-sm text-bone/75">{user?.name}</span><button onClick={logout} className="font-display text-sm text-bone/75 hover:text-signal">Log out</button></div></header><main className="max-w-6xl mx-auto"><AIAdvisor /></main></div>;
}
