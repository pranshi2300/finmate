import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { formatMoney, formatDate } from "../utils/format";
import SettlementPanel from "../components/SettlementPanel";
import FinanceStickers from "../components/FinanceStickers";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [group, setGroup] = useState(null);
  const [balances, setBalances] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [groupRes, balancesRes, settlementRes] = await Promise.all([
      api.get(`/groups/${id}`),
      api.get(`/groups/${id}/balances`),
      api.get(`/groups/${id}/settlement`),
    ]);
    setGroup(groupRes.data.group);
    setBalances(balancesRes.data.balances);
    setTransactions(settlementRes.data.transactions);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function onSubmit(values) {
    setServerError("");
    try {
      await api.post(`/groups/${id}/expenses`, {
        description: values.description,
        amount: Number(values.amount),
      });
      reset();
      loadAll();
    } catch (err) {
      setServerError(err.response?.data?.error || "Couldn't add that expense.");
    }
  }

  async function handleDeleteGroup() {
    const confirmed = window.confirm(
      `Delete "${group.name}"? This permanently removes all its expenses and can't be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/groups/${id}`);
      navigate("/groups");
    } catch (err) {
      setServerError(err.response?.data?.error || "Couldn't delete this group.");
      setDeleting(false);
    }
  }

  if (loading || !group) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center">
        <p className="font-mono text-bone/65 text-sm flex items-center gap-2"><span className="spinner text-ledger" />loading group…</p>
      </div>
    );
  }

  const memberCount = group.members.length;

  return (
    <div className="min-h-screen bg-app relative">
      <FinanceStickers />
      <header className="relative z-10 border-b border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">FinMate AI</span>
          <Link to="/dashboard" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Dashboard
          </Link>
          <Link to="/groups" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Groups
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-bone/75 text-sm">{user?.name}</span>
          <button onClick={logout} className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Log out
          </button>
        </div>
      </header>

      <main className="relative z-10 p-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-ledger-light text-xs tracking-[0.15em] uppercase">Group</p>
            <h1 className="font-display text-bone text-4xl font-semibold mt-2">{group.name}</h1>
            <p className="font-body text-bone/70 text-sm mt-1">
              {group.members.map((m) => m.user.name).join(", ")}
            </p>
          </div>
          {group.createdById === user?.id && (
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="font-mono text-signal/70 hover:text-signal text-xs uppercase tracking-wide border border-signal/30 hover:border-signal rounded-xl px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete group"}
            </button>
          )}
        </div>
        {serverError && (
          <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-xl px-3 py-2 mt-3">
            {serverError}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,320px)_1fr] gap-6">
          <form onSubmit={handleSubmit(onSubmit)} className="border border-hairline rounded-xl p-5 h-fit animate-in card-surface" noValidate>
            <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-4">Add group expense</p>

            <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Description</label>
            <input
              type="text"
              className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
              {...register("description", { required: "Required" })}
            />
            {errors.description && <p className="text-signal text-xs mt-1">{errors.description.message}</p>}

            <label className="font-mono text-sm text-bone/75 uppercase tracking-wide mt-3 block">
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
              {...register("amount", {
                required: "Required",
                valueAsNumber: true,
                validate: (v) => v > 0 || "Must be greater than 0",
              })}
            />
            {errors.amount && <p className="text-signal text-xs mt-1">{errors.amount.message}</p>}

            <p className="font-body text-bone/65 text-xs mt-2">
              Splits equally across all {memberCount} member{memberCount !== 1 && "s"}. You're recorded as the payer.
            </p>

            {serverError && (
              <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-xl px-3 py-2 mt-3">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-ledger hover:bg-ledger-light disabled:opacity-50 transition-colors text-white font-display tracking-wide fun-hover text-sm font-semibold rounded-xl py-2.5 mt-4"
            >
              {isSubmitting ? "Adding…" : "Add expense"}
            </button>
          </form>

          <div className="space-y-6">
            <div>
              <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-3">Expense history</p>
              {group.expenses.length === 0 ? (
                <p className="font-body text-bone/65 text-sm border border-dashed border-hairline rounded-xl p-6 text-center">
                  No expenses yet.
                </p>
              ) : (
                <div className="divide-y divide-hairline border border-hairline rounded-xl overflow-hidden card-surface">
                  {group.expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="font-display text-bone text-base">{e.description}</p>
                        <p className="font-mono text-bone/65 text-xs mt-0.5">
                          {formatDate(e.date)} · paid by {e.paidBy.name}
                        </p>
                      </div>
                      <span className="font-mono text-bone text-sm">{formatMoney(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SettlementPanel balances={balances} transactions={transactions} currentUserId={user?.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
