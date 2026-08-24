import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
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

    try {
      const [txRes, summaryRes, budgetsRes] = await Promise.all([
        api.get("/transactions?limit=20"),
        api.get("/transactions/summary"),
        api.get("/budgets"),
      ]);

      setTransactions(txRes.data.transactions);
      setSummary(summaryRes.data);
      setBudgets(budgetsRes.data.budgets);
    } finally {
      setLoading(false);
      setBudgetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleCreated() {
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
    <div className="min-h-screen w-full bg-app relative overflow-x-hidden">
      <FinanceStickers />

      {/* ================= HEADER ================= */}
      <header className="relative z-10 w-full border-b border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">
            FinMate AI
          </span>

          <Link
            to="/groups"
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Groups
          </Link>

          <Link
            to="/insights"
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Insights
          </Link>

          <Link
            to="/advisor"
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Advisor
          </Link>

          <Link
            to="/notifications"
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Notifications
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-body text-bone/75 text-sm">
            {user?.name}
          </span>

          <NotificationDrawer />

          <button
            onClick={logout}
            className="font-display text-bone/75 hover:text-signal text-sm transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* ================= MAIN ================= */}
      <main className="relative z-10 w-full max-w-none px-6 sm:px-8 lg:px-10 py-8">

        {/* ================= OVERVIEW ================= */}
        <p className="font-mono text-ledger-light text-xs tracking-[0.15em] uppercase">
          Overview
        </p>

        <h1 className="font-display text-bone text-4xl font-semibold mt-2">
          Welcome, {user?.name?.split(" ")[0]}.
        </h1>

        {/* ================= SUMMARY CARDS ================= */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 w-full">

          {/* Income */}
          <div className="w-full min-w-0 rounded-xl border border-hairline bg-card p-6">
            <p className="font-mono text-bone/60 text-sm uppercase">
              Income
            </p>

            <p className="font-display text-signal text-3xl font-semibold mt-3">
              ₹
              {Number(
                summary?.income ?? summary?.totalIncome ?? 0
              ).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Expenses */}
          <div className="w-full min-w-0 rounded-xl border border-hairline bg-card p-6">
            <p className="font-mono text-bone/60 text-sm uppercase">
              Expenses
            </p>

            <p className="font-display text-signal text-3xl font-semibold mt-3">
              ₹
              {Number(
                summary?.expenses ?? summary?.totalExpenses ?? 0
              ).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          {/* Balance */}
          <div className="w-full min-w-0 rounded-xl border border-hairline bg-card p-6">
            <p className="font-mono text-bone/60 text-sm uppercase">
              Balance
            </p>

            <p className="font-display text-bone text-3xl font-semibold mt-3">
              ₹
              {Number(
                summary?.balance ??
                  summary?.net ??
                  (summary?.income ?? 0) - (summary?.expenses ?? 0)
              ).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        {/* =========================================================
            RECEIPT
        ========================================================= */}
        <section className="mt-8 w-full">
          <div className="w-full min-w-0">
            <ReceiptUploader onConverted={handleCreated} />
          </div>
        </section>

        {/* =========================================================
            TRANSACTION FORM
        ========================================================= */}
        <section className="mt-6 w-full">
          <div className="w-full min-w-0">
            <TransactionForm onCreated={handleCreated} />
          </div>
        </section>

        {/* =========================================================
            AI INSIGHTS
        ========================================================= */}
        <section className="mt-6 w-full">
          <div className="w-full min-w-0">
            <InsightsDashboard />
          </div>
        </section>

        {/* =========================================================
            PREDICTIONS
        ========================================================= */}
        <section className="mt-6 w-full">
          <div className="w-full min-w-0">
            <PredictionDashboard />
          </div>
        </section>

        {/* =========================================================
            RECENT TRANSACTIONS
        ========================================================= */}
        <section className="mt-8 w-full">
          <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-3">
            Recent transactions
          </p>

          <div className="w-full min-w-0">
            <TransactionList
              transactions={transactions}
              loading={loading}
              onDelete={handleDelete}
            />
          </div>
        </section>

        {/* =========================================================
            BUDGET FORM
        ========================================================= */}
        <section className="mt-8 w-full">
          <div className="w-full min-w-0">
            <BudgetForm onSaved={loadData} />
          </div>
        </section>

        {/* =========================================================
            BUDGET LIST
        ========================================================= */}
        <section className="mt-8 w-full">
          <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-3">
            Budgets this month
          </p>

          <div className="w-full min-w-0">
            <BudgetList
              budgets={budgets}
              loading={budgetsLoading}
              onDelete={handleDeleteBudget}
            />
          </div>
        </section>

      </main>
    </div>
  );
}