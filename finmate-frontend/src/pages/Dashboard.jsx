import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import TransactionForm from "../components/TransactionForm";
import ReceiptUploader from "../components/ReceiptUploader";
import InsightsDashboard from "../components/InsightsDashboard";
import PredictionDashboard from "../components/PredictionDashboard";
import TransactionList from "../components/TransactionList";
import BudgetForm from "../components/BudgetForm";
import BudgetList from "../components/BudgetList";
import FinanceStickers from "../components/FinanceStickers";
import NotificationDrawer from "../components/NotificationDrawer";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [budgetsLoading, setBudgetsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setBudgetsLoading(true);
    const [txRes, summaryRes, budgetsRes] = await Promise.all([
      api.get("/transactions?limit=20"),
      api.get("/transactions/summary"),
      api.get("/budgets"),
    ]);
    setTransactions(txRes.data.transactions);
    setSummary(summaryRes.data);
    setBudgets(budgetsRes.data.budgets);
    setLoading(false);
    setBudgetsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleCreated(transaction) {
    // Refetch rather than manually splicing state — keeps summary totals
    // and the list in sync without duplicating aggregation logic on the client.
    loadData();
  }

  async function handleDelete(id) {
    await api.delete(`/transactions/${id}`);
    loadData();
  }

  async function handleDeleteBudget(id) {
    await api.delete(`/budgets/${id}`);
    loadData();
  }

  return (
    <div className="min-h-screen bg-app relative">
      <FinanceStickers />
      <header className="relative z-10 border-b border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">FinMate AI</span>
          <Link to="/groups" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Groups
          </Link>
          <Link to="/insights" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Insights
          </Link>
          <Link to="/advisor" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Advisor
          </Link>
          <Link to="/notifications" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">Notifications</Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-bone/75 text-sm">{user?.name}</span>
          <NotificationDrawer />
          <button
            onClick={logout}
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-5xl mx-auto">
        <p className="font-mono text-ledger-light text-xs tracking-[0.15em] uppercase">Overview</p>
        <h1 className="font-display text-bone text-4xl font-semibold mt-2">
          Welcome, {user?.name?.split(" ")[0]}.
        </h1>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-hairline rounded-xl p-4 animate-in card-surface fun-hover">
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide">Income</p>
            <p className="font-mono text-ledger-light text-xl mt-1">
              {summary ? formatMoney(summary.totalIncome) : "—"}
            </p>
          </div>
          <div className="border border-hairline rounded-xl p-4 animate-in card-surface delay-1 fun-hover">
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide">Expenses</p>
            <p className="font-mono text-signal text-xl mt-1">
              {summary ? formatMoney(summary.totalExpenses) : "—"}
            </p>
          </div>
          <div className="border border-hairline rounded-xl p-4 animate-in card-surface delay-2 fun-hover">
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide">Balance</p>
            <p className="font-mono text-bone text-xl mt-1">
              {summary ? formatMoney(summary.balance) : "—"}
            </p>
          </div>
        </div>

        {/* Form + list */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
          <div className="space-y-6">
            <ReceiptUploader onConverted={handleCreated} />
            <TransactionForm onCreated={handleCreated} />
            {/* AI Insights card integrated here to keep near forms */}
            <InsightsDashboard />
           <PredictionDashboard />
          </div>

          <div>
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-3">
              Recent transactions
            </p>
            <TransactionList transactions={transactions} loading={loading} onDelete={handleDelete} />
          </div>
        </div>

        {/* Budgets */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
          <BudgetForm onSaved={loadData} />

          <div>
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-3">
              Budgets this month
            </p>
            <BudgetList budgets={budgets} loading={budgetsLoading} onDelete={handleDeleteBudget} />
          </div>
        </div>
      </main>
    </div>
  );
}
