"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      <div className="aurora" />
      <div className="noise" />

      <div className="relative z-10 text-center glass r-xl p-8 max-w-md animate-rise shadow-[0_0_80px_rgba(244,63,94,0.2)]">
        <p className="font-display text-6xl mb-4">💀</p>
        <h2 className="font-display text-3xl font-bold text-ink mb-2">Game over?</h2>

        <p className="text-ink2 text-sm leading-relaxed">
          {error.message || "An unexpected error crashed the dashboard."}
        </p>
        {error.digest && (
          <p className="text-ink3 text-xs mt-2 font-mono">error id: {error.digest}</p>
        )}

        <div className="flex flex-col gap-2.5 mt-7">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3.5 r-lg bg-gradient-to-r from-rose-500 to-pink-600 text-white font-display font-semibold shadow-lg shadow-rose-500/25 hover:brightness-110 hover:-translate-y-0.5 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Continue?
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 r-lg chip chip-hover text-ink2 text-sm hover:text-ink transition-all"
          >
            back to title screen
          </Link>
        </div>
      </div>
    </div>
  );
}
