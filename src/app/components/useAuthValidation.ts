"use client";

import { useEffect, useRef, useState } from "react";
import { PASSWORD_RULES } from "@/lib/password";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

/** Debounced live username-availability check against /api/auth/username-available. */
export function useUsernameAvailability(username: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!username) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      return;
    }
    setStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (data.error) setStatus("invalid");
        else setStatus(data.available ? "available" : "taken");
      } catch {
        setStatus("idle");
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  return status;
}

/** Live pass/fail state for each strong-password rule, for a real-time checklist UI. */
export function usePasswordChecklist(password: string) {
  const checks = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const valid = checks.every((c) => c.passed);
  return { checks, valid };
}
