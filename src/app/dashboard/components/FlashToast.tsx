"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * Tiny toast for non-XP flashes ("BACKGROUND SAVED", "NEW HABIT FORGED").
 * Separate from RewardLayer's XP toasts, which carry a reward breakdown —
 * this one is just a fire-and-forget confirmation message.
 */

interface FlashToastContextValue {
  flash: (msg: string) => void;
}

const FlashToastContext = createContext<FlashToastContextValue | null>(null);

export function useFlashToast(): FlashToastContextValue {
  const ctx = useContext(FlashToastContext);
  if (!ctx) throw new Error("useFlashToast must be used inside <FlashToastProvider>");
  return ctx;
}

export default function FlashToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const keyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((text: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg({ text, key: ++keyRef.current });
    timerRef.current = setTimeout(() => setMsg(null), 2100);
  }, []);

  return (
    <FlashToastContext.Provider value={{ flash }}>
      {children}
      {msg && (
        <div
          key={msg.key}
          className="fixed left-1/2 -translate-x-1/2 bottom-8 lg:bottom-8 z-[65] glass r-lg animate-pop px-5 py-2.5 whitespace-nowrap max-w-[92vw] overflow-hidden pointer-events-none"
        >
          <span className="grad-text font-display font-extrabold text-sm">{msg.text}</span>
        </div>
      )}
    </FlashToastContext.Provider>
  );
}
