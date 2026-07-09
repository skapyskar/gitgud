import React from "react";
import { ThemeProvider, useTheme, SKIN_INFO } from "gitgud";

/** Shows the live theme context: current skin/mode plus the available skins. */
const ThemeReadout = () => {
  const { skin, mode } = useTheme();
  return (
    <div className="glass r-xl p-5" style={{ width: 380 }}>
      <span className="text-[11px] font-semibold tracking-widest text-ink3 uppercase block mb-3">
        Theme engine
      </span>
      <p className="text-sm text-ink mb-3">
        active: <span className="grad-text font-bold">{skin}</span>
        <span className="text-ink3"> · </span>
        <span className="text-ink2 font-semibold">{mode}</span>
      </p>
      <div className="flex gap-2">
        {(Object.keys(SKIN_INFO) as Array<keyof typeof SKIN_INFO>).map((s) => (
          <div key={s} className="chip r-lg px-3 py-2 flex-1 text-center">
            <span className="block font-display font-bold text-sm text-ink">{SKIN_INFO[s].icon}</span>
            <span className="block text-[11px] font-semibold text-ink2 mt-1">{SKIN_INFO[s].label}</span>
            <span className="block text-[9px] text-ink3">{SKIN_INFO[s].blurb}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ThemeContext = () => (
  <ThemeProvider>
    <ThemeReadout />
  </ThemeProvider>
);
