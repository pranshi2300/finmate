import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(values) {
    setServerError("");
    try {
      await login(values.email, values.password);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.error || "Something went wrong. Try again.");
    }
  }

  return (
    <AuthLayout eyebrow="Welcome back" title="Log in" subtitle="Pick up where your budget left off.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="font-mono text-xs text-bone/75 uppercase tracking-wide">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-md px-3 py-2.5 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-signal text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="font-mono text-xs text-bone/75 uppercase tracking-wide">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-md px-3 py-2.5 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("password", { required: "Password is required" })}
          />
          {errors.password && <p className="text-signal text-xs mt-1">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-md px-3 py-2">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-ledger hover:bg-ledger-light disabled:opacity-50 transition-colors text-white font-display tracking-wide text-sm font-semibold rounded-md py-2.5 mt-2"
        >
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="font-body text-bone/70 text-sm mt-6">
        New to FinMate?{" "}
        <Link to="/register" className="text-signal hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
