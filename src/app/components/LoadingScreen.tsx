import { GitGudLogo } from "./GitGudLogo";

/** Shared full-screen loading state for route transitions. */
export default function LoadingScreen({ label = "loading" }: { label?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="aurora" />
      <div className="noise" />

      <div className="relative z-10 flex flex-col items-center gap-6 p-8">
        <div className="animate-float">
          <GitGudLogo className="w-24 h-24" />
        </div>
        <div className="w-56 h-2 chip rounded-full overflow-hidden">
          <div className="h-full w-1/2 grad-primary rounded-full xp-shimmer" />
        </div>
        <p className="text-ink2 text-sm font-medium">
          {label}
          <span className="animate-blink">…</span>
        </p>
      </div>
    </main>
  );
}
