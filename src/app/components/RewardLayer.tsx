"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Zap, Coins, Flame, Clock, Repeat, Volume2, VolumeX } from "lucide-react";

/**
 * Reward feedback layer: floating "+XP" toasts, a level-up takeover,
 * and tiny synth sounds. Wrap the dashboard in <RewardProvider> and
 * call celebrate() with the /api/tasks/complete response.
 */

export interface RewardEvent {
  xpGained: number;
  coinsGained?: number;
  breakdown?: {
    baseXP: number;
    streakBonus: number;
    durationBonus: number;
    weeklyBonus: number;
  };
  newStreak?: number;
  leveledUp?: boolean;
  levelAfter?: number;
  rank?: string;
}

interface RewardContextValue {
  celebrate: (reward: RewardEvent) => void;
  muted: boolean;
  toggleMuted: () => void;
}

const RewardContext = createContext<RewardContextValue | null>(null);

export function useRewards(): RewardContextValue {
  const ctx = useContext(RewardContext);
  if (!ctx) throw new Error("useRewards must be used inside <RewardProvider>");
  return ctx;
}

/** Speaker toggle for reward sounds — must live inside <RewardProvider>. */
export function MuteToggle() {
  const { muted, toggleMuted } = useRewards();
  return (
    <button
      onClick={toggleMuted}
      className="p-2 r-md text-ink3 hover:text-ink hover:bg-[var(--chip-hover)] transition-all"
      title={muted ? "Unmute reward sounds" : "Mute reward sounds"}
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}

/* Small synth "bleep" so completions feel tactile without audio assets. */
function playTone(muted: boolean, kind: "reward" | "levelup") {
  if (muted || typeof window === "undefined") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const notes = kind === "levelup" ? [523.25, 659.25, 783.99, 1046.5] : [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + i * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.14);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.16);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio is a nice-to-have — never break the app over it */
  }
}

interface Toast extends RewardEvent {
  id: number;
}

export default function RewardProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; rank?: string } | null>(null);
  const [muted, setMuted] = useState(false);
  const idRef = useRef(0);

  // Read persisted mute preference after mount (avoids hydration mismatch).
  React.useEffect(() => {
    setMuted(localStorage.getItem("gg-muted") === "1");
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      localStorage.setItem("gg-muted", m ? "0" : "1");
      return !m;
    });
  }, []);

  const celebrate = useCallback(
    (reward: RewardEvent) => {
      if (reward.xpGained <= 0 && !reward.leveledUp) return;

      const id = ++idRef.current;
      setToasts((t) => [...t.slice(-2), { ...reward, id }]);
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
      }, 2600);

      if (reward.leveledUp && reward.levelAfter) {
        setTimeout(() => {
          setLevelUp({ level: reward.levelAfter!, rank: reward.rank });
          playTone(muted, "levelup");
        }, 500);
      } else {
        playTone(muted, "reward");
      }
    },
    [muted]
  );

  return (
    <RewardContext.Provider value={{ celebrate, muted, toggleMuted }}>
      {children}

      {/* XP toasts */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] flex flex-col-reverse items-center gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-rise glass r-lg shadow-[0_0_50px_var(--glow)] px-6 py-3.5 flex flex-col items-center"
          >
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl font-bold grad-text">
                +{toast.xpGained} XP
              </span>
              {!!toast.coinsGained && (
                <span className="flex items-center gap-1 text-gold font-semibold text-sm">
                  <Coins className="w-4 h-4" /> +{toast.coinsGained}
                </span>
              )}
            </div>
            {toast.breakdown && (
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ink2">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-acc" /> {toast.breakdown.baseXP}
                </span>
                {toast.breakdown.streakBonus > 0 && (
                  <span className="flex items-center gap-1 text-warm">
                    <Flame className="w-3 h-3" /> +{toast.breakdown.streakBonus}
                  </span>
                )}
                {toast.breakdown.durationBonus > 0 && (
                  <span className="flex items-center gap-1 text-hab">
                    <Clock className="w-3 h-3" /> +{toast.breakdown.durationBonus}
                  </span>
                )}
                {toast.breakdown.weeklyBonus > 0 && (
                  <span className="flex items-center gap-1 text-acc3">
                    <Repeat className="w-3 h-3" /> +{toast.breakdown.weeklyBonus}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Level-up takeover */}
      {levelUp && (
        <div
          className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-lg flex items-center justify-center cursor-pointer"
          onClick={() => setLevelUp(null)}
        >
          <div className="animate-levelup relative flex items-center justify-center">
            <div className="levelup-ring absolute w-[26rem] h-[26rem] rounded-full" />
            <div className="glass rounded-full w-80 h-80 flex flex-col items-center justify-center text-center shadow-[0_0_120px_var(--glow)]">
              <p className="text-[11px] font-semibold tracking-[0.4em] text-ink2 uppercase mb-2">
                Level up
              </p>
              <h2 className="font-display text-7xl font-extrabold grad-text leading-none">
                {levelUp.level}
              </h2>
              {levelUp.rank && (
                <p className="font-display text-lg font-semibold grad-text-warm mt-3">
                  {levelUp.rank}
                </p>
              )}
              <p className="text-ink3 text-[11px] mt-5 animate-blink">tap to continue</p>
            </div>
          </div>
        </div>
      )}
    </RewardContext.Provider>
  );
}
