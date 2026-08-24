import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";

export default function Register() {
  const { register: registerUser } = useAuth();
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
      await registerUser(values.name, values.email, values.password);
      navigate("/dashboard");
    } catch (err) {
      setServerError(err.response?.data?.error || "Something went wrong. Try again.");
    }
  }

  return (
    <AuthLayout eyebrow="Get started" title="Create your account" subtitle="Free plan, no card required.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="font-mono text-sm text-bone/75 uppercase tracking-wide">
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2.5 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("name", { required: "Name is required", minLength: { value: 2, message: "Name must be at least 2 characters" } })}
          />
          {errors.name && <p className="text-signal text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="font-mono text-sm text-bone/75 uppercase tracking-wide">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2.5 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-signal text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="font-mono text-sm text-bone/75 uppercase tracking-wide">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-xl px-3 py-2.5 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              pattern: {
                value: /^(?=.*[A-Z])(?=.*[0-9]).+$/,
                message: "Needs an uppercase letter and a number",
              },
            })}
          />
          {errors.password && <p className="text-signal text-xs mt-1">{errors.password.message}</p>}
        </div>

        {serverError && (
          <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-xl px-3 py-2">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-ledger hover:bg-ledger-light disabled:opacity-50 transition-colors text-white font-display tracking-wide fun-hover text-sm font-semibold rounded-xl py-2.5 mt-2"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="font-body text-bone/70 text-sm mt-6">
        Already have an account?{" "}
        <Link to="/login" className="text-signal hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
