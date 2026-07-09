"use client";

import React, { useState } from "react";
import { Settings, Sun, Moon, Check } from "lucide-react";
import { useTheme, SKIN_INFO, BUILTIN_WALLPAPERS, isWallpaperSkin, Skin } from "./theme";
import { MuteToggle } from "./RewardLayer";

/** Gear popover: skin, light/dark, clock seconds, sounds. */
export default function SettingsMenu() {
  const { skin, mode, showSeconds, update } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-2 r-md transition-all ${open ? "bg-acc/15 text-acc" : "text-ink3 hover:text-ink hover:bg-[var(--chip-hover)]"}`}
        title="Appearance & settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-11 z-50 w-72 glass r-xl p-4 animate-pop shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
            {/* Skins */}
            <p className="text-[11px] font-semibold tracking-widest uppercase text-ink3 mb-2">
              Skin
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(Object.keys(SKIN_INFO) as Skin[])
                .filter((s) => s !== "custom") // needs the upload flow on the dashboard header
                .map((s) => (
                <button
                  key={s}
                  onClick={() => update({ skin: s })}
                  className={`r-lg p-2.5 text-center transition-all border overflow-hidden relative ${
                    skin === s
                      ? "border-acc/60 bg-acc/10 shadow-[0_0_16px_var(--glow)]"
                      : "chip chip-hover border-line"
                  }`}
                  style={
                    isWallpaperSkin(s)
                      ? { backgroundImage: `url("${BUILTIN_WALLPAPERS[s]}")`, backgroundSize: "cover", backgroundPosition: "center" }
                      : undefined
                  }
                >
                  {isWallpaperSkin(s) && (
                    <span className="absolute inset-0 bg-[rgba(5,6,12,0.45)]" />
                  )}
                  <span className="relative block font-display font-bold text-sm text-ink">
                    {isWallpaperSkin(s) ? "" : SKIN_INFO[s].icon}
                  </span>
                  <span className="relative block text-[11px] font-semibold text-ink2 mt-1">
                    {SKIN_INFO[s].label}
                  </span>
                  <span className="relative block text-[9px] text-ink3">{SKIN_INFO[s].blurb}</span>
                </button>
              ))}
            </div>

            {/* Mode */}
            <p className="text-[11px] font-semibold tracking-widest uppercase text-ink3 mb-2">
              Mode
            </p>
            <div className="chip r-lg p-1 flex mb-4">
              {(["dark", "light"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mode: m })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 r-md text-xs font-semibold transition-all ${
                    mode === m ? "grad-primary text-white glow-shadow" : "text-ink3 hover:text-ink"
                  }`}
                >
                  {m === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {m}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="space-y-1">
              <button
                onClick={() => update({ showSeconds: !showSeconds })}
                className="w-full flex items-center justify-between px-2 py-2 r-md hover:bg-[var(--chip-hover)] transition-colors"
              >
                <span className="text-sm text-ink2">Clock seconds</span>
                <span
                  className={`w-5 h-5 r-md border flex items-center justify-center transition-all ${
                    showSeconds ? "grad-primary border-transparent" : "border-line"
                  }`}
                >
                  {showSeconds && <Check className="w-3.5 h-3.5 text-white" />}
                </span>
              </button>
              <div className="w-full flex items-center justify-between px-2 py-1">
                <span className="text-sm text-ink2">Reward sounds</span>
                <MuteToggle />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
