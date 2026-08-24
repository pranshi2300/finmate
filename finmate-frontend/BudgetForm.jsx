import { useState } from "react";
import { useForm } from "react-hook-form";
import api from "../api/axios";

const CATEGORIES = ["Food", "Transport", "Rent", "Bills", "Shopping", "Health", "Entertainment", "Other"];

export default function BudgetForm({ onSaved }) {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(values) {
    setServerError("");
    try {
      const { data } = await api.post("/budgets", {
        category: values.category,
        monthlyLimit: Number(values.monthlyLimit),
      });
      reset({ category: "", monthlyLimit: "" });
      onSaved?.(data.budget);
    } catch (err) {
      setServerError(err.response?.data?.error || "Couldn't save that budget. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border border-hairline rounded-md p-5" noValidate>
      <p className="font-mono text-xs text-bone/65 uppercase tracking-wide mb-4">Set a budget</p>

      <div>
        <label className="font-mono text-xs text-bone/75 uppercase tracking-wide">Category</label>
        <select
          className="mt-1.5 w-full bg-ink border border-hairline rounded-md px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
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
        <label className="font-mono text-xs text-bone/75 uppercase tracking-wide">Monthly limit (₹)</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          className="mt-1.5 w-full bg-transparent border border-hairline rounded-md px-3 py-2 text-bone font-mono text-sm focus:border-signal transition-colors"
          {...register("monthlyLimit", {
            required: "Required",
            valueAsNumber: true,
            validate: (v) => v > 0 || "Must be greater than 0",
          })}
        />
        {errors.monthlyLimit && <p className="text-signal text-xs mt-1">{errors.monthlyLimit.message}</p>}
      </div>

      {serverError && (
        <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-md px-3 py-2 mt-3">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-ledger hover:bg-ledger-light disabled:opacity-50 transition-colors text-white font-display tracking-wide text-sm font-semibold rounded-md py-2.5 mt-4"
      >
        {isSubmitting ? "Saving…" : "Save budget"}
      </button>
      <p className="font-body text-bone/65 text-xs mt-2">
        Setting a category that already has a budget updates its limit.
      </p>
    </form>
  );
}
