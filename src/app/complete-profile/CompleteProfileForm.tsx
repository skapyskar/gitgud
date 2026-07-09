"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { inputCls, labelCls, HudButton } from "../components/ui";
import { GitGudLogo } from "../components/GitGudLogo";
import { useUsernameAvailability, usePasswordChecklist } from "../components/useAuthValidation";

export default function CompleteProfileForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usernameStatus = useUsernameAvailability(username);
  const { checks: passwordChecks, valid: passwordValid } = usePasswordChecklist(password);
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = usernameStatus === "available" && passwordValid && passwordsMatch && !busy;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;

    setBusy(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass r-xl w-full max-w-md p-8">
      <div className="flex items-center gap-2.5 mb-6">
        <GitGudLogo className="w-8 h-8" />
        <span className="font-display text-lg font-extrabold tracking-tight">
          GIT <span className="grad-text">GUD</span>
        </span>
      </div>
      <h1 className="font-display text-xl font-bold mb-1">Set up your account</h1>
      <p className="text-sm text-ink3 mb-6">
        Choose a username and password so you can also log in without Google or GitHub.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Username</label>
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. night_owl"
            autoComplete="username"
            required
          />
          {usernameStatus === "checking" && <p className="text-xs text-ink3 mt-1">Checking availability…</p>}
          {usernameStatus === "available" && (
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <Check className="w-3 h-3" /> Available
            </p>
          )}
          {usernameStatus === "taken" && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <X className="w-3 h-3" /> Already taken
            </p>
          )}
          {usernameStatus === "invalid" && (
            <p className="text-xs text-rose-400 mt-1">3-20 chars, lowercase letters/numbers/underscore, must start with a letter.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <ul className="mt-1.5 space-y-0.5">
            {passwordChecks.map((r) => (
              <li key={r.key} className={`text-[11px] flex items-center gap-1.5 ${r.passed ? "text-emerald-400" : "text-ink3"}`}>
                {r.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <label className={labelCls}>Confirm password</label>
          <input
            className={inputCls}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {confirm.length > 0 && !passwordsMatch && <p className="text-xs text-rose-400 mt-1">Passwords don&apos;t match.</p>}
        </div>
        {error && <div className="text-sm text-rose-400">{error}</div>}
        <HudButton type="submit" variant="primary" disabled={!canSubmit} className="py-2.5">
          {busy ? "Saving…" : "Continue"}
        </HudButton>
      </form>
    </div>
  );
}
