import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";

const CATEGORIES = ["Food", "Transport", "Rent", "Bills", "Shopping", "Health", "Entertainment", "Salary", "Other"];

export default function TransactionForm({ onCreated }) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      type: "EXPENSE",
      date: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch("type");

  async function onSubmit(values) {
    setServerError("");
    try {
      const { data } = await api.post("/transactions", {
        ...values,
        amount: Number(values.amount),
      });
      reset({
        type: values.type,
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        category: "",
        note: "",
      });
      onCreated?.(data.transaction);
    } catch (err) {
      setServerError(err.response?.data?.error || "Couldn't save that transaction. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border border-hairline rounded-xl p-5 animate-in card-surface" noValidate>
      <p className="font-mono text-sm text-bone/65 uppercase tracking-wide mb-4">Add transaction</p>

      {/* Income/Expense toggle */}
      <div className="flex gap-2 mb-4">
        {["EXPENSE", "INCOME"].map((t) => (
          <label
            key={t}
            className={`flex-1 text-center py-2 rounded-xl text-sm font-body cursor-pointer border transition-colors ${
              type === t
                ? t === "EXPENSE"
                  ? "bg-signal/15 border-signal text-signal"
                  : "bg-ledger/20 border-ledger-light text-ledger-light"
                : "border-hairline text-bone/70"
            }`}
          >
            <input type="radio" value={t} {...register("type")} className="sr-only" />
            {t === "EXPENSE" ? "Expense" : "Income"}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Amount (₹)</label>
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
        </div>

        <div>
          <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Date</label>
          <input
            type="date"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
            {...register("date", { required: "Required" })}
          />
          {errors.date && <p className="text-signal text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div className="mt-3">
        <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Category</label>
        <select
          className="mt-1.5 w-full bg-ink border border-hairline rounded-xl px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
          {...register("category", { required: "Pick a category" })}
        >
          <option value="">Select…</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.category && <p className="text-signal text-xs mt-1">{errors.category.message}</p>}
      </div>

      <div className="mt-3">
        <label className="font-mono text-sm text-bone/75 uppercase tracking-wide">Note (optional)</label>
        <input
          type="text"
          maxLength={280}
          className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
          {...register("note")}
        />
      </div>

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
        {isSubmitting ? "Saving…" : "Add transaction"}
      </button>
    </form>
  );
}
