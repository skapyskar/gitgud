"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Github, Check, X } from "lucide-react";
import { GitGudLogo } from "./GitGudLogo";
import { inputCls, labelCls, HudButton } from "./ui";
import { useUsernameAvailability, usePasswordChecklist } from "./useAuthValidation";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
  </svg>
);

function OAuthButtons({ isLoading, onLogin }: { isLoading: string | null; onLogin: (p: "google" | "github") => void }) {
  return (
    <div className="space-y-3">
      <button
        onClick={() => onLogin("github")}
        disabled={!!isLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 r-lg grad-primary text-white font-display font-semibold glow-shadow hover:brightness-110 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Github className="w-5 h-5" />
        {isLoading === "github" ? "Connecting…" : "Continue with GitHub"}
      </button>
      <button
        onClick={() => onLogin("google")}
        disabled={!!isLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 r-lg chip chip-hover text-ink font-display font-semibold hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {isLoading === "google" ? "Connecting…" : "Continue with Google"}
      </button>
    </div>
  );
}

function LoginPanel({ isLoading, onOAuthLogin }: { isLoading: string | null; onOAuthLogin: (p: "google" | "github") => void }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/credentials-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid username or password");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <OAuthButtons isLoading={isLoading} onLogin={onOAuthLogin} />

      <div className="flex items-center gap-3 text-ink3">
        <div className="flex-1 h-px bg-line" />
        <span className="text-[11px] tracking-wide">OR USERNAME + PASSWORD</span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3 text-left">
        <div>
          <label className={labelCls}>Username</label>
          <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
        </div>
        <div>
          <label className={labelCls}>Password</label>
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <div className="text-sm text-rose-400">{error}</div>}
        <HudButton type="submit" variant="ghost" disabled={busy} className="w-full py-2.5">
          {busy ? "Signing in…" : "Log in"}
        </HudButton>
      </form>
    </div>
  );
}

function CreateAccountPanel() {
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <label className={labelCls}>Username</label>
        <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
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
      <HudButton type="submit" variant="primary" disabled={!canSubmit} className="w-full py-2.5">
        {busy ? "Creating account…" : "Create account"}
      </HudButton>
    </form>
  );
}

export default function AuthGate() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<"login" | "signup">("login");

  const handleOAuthLogin = (provider: "google" | "github") => {
    setIsLoading(provider);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  return (
    <div className="relative z-10 w-full max-w-md glass r-xl p-8 animate-rise shadow-[0_0_80px_var(--glow)]">
      <div className="flex flex-col items-center gap-4 text-center mb-6">
        <div className="animate-float">
          <GitGudLogo className="w-16 h-16" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-bold text-ink">
            {tab === "login" ? "Player login" : "New player"}
          </h2>
          <p className="text-sm text-ink3 mt-1.5">
            {tab === "login" ? "sign in to load your save file" : "create a fresh save file"}
          </p>
        </div>
      </div>

      <div className="chip r-lg p-1 flex mb-6">
        {(["login", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 r-md text-sm font-semibold transition-all ${
              tab === t ? "grad-primary text-white glow-shadow" : "text-ink3 hover:text-ink"
            }`}
          >
            {t === "login" ? "Log In" : "Create Account"}
          </button>
        ))}
      </div>

      {tab === "login" ? (
        <LoginPanel isLoading={isLoading} onOAuthLogin={handleOAuthLogin} />
      ) : (
        <CreateAccountPanel />
      )}
    </div>
  );
}
