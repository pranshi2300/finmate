import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function Groups() {
  const { user, logout } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [notFoundNotice, setNotFoundNotice] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const { data } = await api.get("/groups");
    setGroups(data.groups);
    setLoading(false);
  }, []);

  async function handleDeleteGroup(id, name) {
    if (!window.confirm(`Delete "${name}"? This removes the group and all its expense history for everyone. This can't be undone.`)) {
      return;
    }
    await api.delete(`/groups/${id}`);
    loadGroups();
  }

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  async function onSubmit(values) {
    setServerError("");
    setNotFoundNotice("");
    const memberEmails = values.memberEmails
      ? values.memberEmails.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    try {
      const { data } = await api.post("/groups", { name: values.name, memberEmails });
      if (data.notFoundEmails?.length) {
        setNotFoundNotice(
          `No account found for: ${data.notFoundEmails.join(", ")} — they weren't added.`
        );
      }
      reset();
      loadGroups();
    } catch (err) {
      setServerError(err.response?.data?.error || "Couldn't create that group.");
    }
  }

  return (
    <div className="min-h-screen bg-app">
      <header className="border-b border-hairline px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-signal text-xs tracking-[0.2em] uppercase">FinMate AI</span>
          <Link to="/dashboard" className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Dashboard
          </Link>
          <span className="font-body text-bone text-sm">Groups</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-body text-bone/75 text-sm">{user?.name}</span>
          <button onClick={logout} className="font-display text-bone/75 hover:text-signal text-sm transition-colors">
            Log out
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <p className="font-mono text-ledger-light text-xs tracking-[0.15em] uppercase">Shared expenses</p>
        <h1 className="font-display text-bone text-4xl font-semibold mt-2">Groups</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="border border-hairline rounded-md p-5 mt-6" noValidate>
          <p className="font-mono text-xs text-bone/65 uppercase tracking-wide mb-4">Create a group</p>

          <label className="font-mono text-xs text-bone/75 uppercase tracking-wide">Group name</label>
          <input
            type="text"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-md px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("name", { required: "Group name is required" })}
          />
          {errors.name && <p className="text-signal text-xs mt-1">{errors.name.message}</p>}

          <label className="font-mono text-xs text-bone/75 uppercase tracking-wide mt-3 block">
            Invite by email (comma-separated) <span className="text-signal">*</span>
          </label>
          <input
            type="text"
            placeholder="friend@example.com, roommate@example.com"
            className="mt-1.5 w-full bg-transparent border border-hairline rounded-md px-3 py-2 text-bone font-body text-sm focus:border-signal transition-colors"
            {...register("memberEmails", {
              required: "Add at least one other member to split expenses with",
              validate: (v) => {
                const emails = v.split(",").map((e) => e.trim()).filter(Boolean);
                return emails.length > 0 || "Add at least one other member to split expenses with";
              },
            })}
          />
          <p className="font-body text-bone/65 text-xs mt-1">
            Only people who already have a FinMate account can be added. A group needs at least one other member.
          </p>
          {errors.memberEmails && <p className="text-signal text-xs mt-1">{errors.memberEmails.message}</p>}

          {notFoundNotice && (
            <p className="text-signal text-sm font-body bg-signal/10 border border-signal/30 rounded-md px-3 py-2 mt-3">
              {notFoundNotice}
            </p>
          )}
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
            {isSubmitting ? "Creating…" : "Create group"}
          </button>
        </form>

        <div className="mt-8">
          <p className="font-mono text-xs text-bone/65 uppercase tracking-wide mb-3">Your groups</p>

          {loading && <p className="font-mono text-bone/65 text-sm">loading…</p>}

          {!loading && !groups.length && (
            <p className="font-body text-bone/65 text-sm border border-dashed border-hairline rounded-md p-6 text-center">
              No groups yet — create one above.
            </p>
          )}

          <div className="space-y-3">
            {groups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between border border-hairline rounded-md p-4 hover:border-signal transition-colors"
              >
                <Link to={`/groups/${g.id}`} className="flex-1 min-w-0">
                  <span className="font-body font-medium text-bone text-base">{g.name}</span>
                  <span className="block font-mono text-bone/65 text-xs mt-0.5">
                    {g._count.members} member{g._count.members !== 1 && "s"} · {g._count.expenses} expense
                    {g._count.expenses !== 1 && "s"}
                  </span>
                </Link>
                {g.createdById === user?.id && (
                  <button
                    onClick={() => handleDeleteGroup(g.id, g.name)}
                    className="font-mono text-bone/75 hover:text-signal text-xs ml-4 shrink-0 transition-colors"
                  >
                    delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
