"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * Theme engine: skin (visual identity) × mode (light/dark) × view (board/focus),
 * persisted to localStorage and applied as data-attributes on <html> so pure
 * CSS variables restyle every component instantly.
 */

export type Skin =
  | "aurora"
  | "terminal"
  | "zen"
  | "custom"
  | "wallpaper1"
  | "wallpaper2"
  | "wallpaper3"
  | "wallpaper4";

export type Mode = "dark" | "light";
export type View = "board" | "focus";

export interface CustomBg {
  type: "image" | "video";
  url: string;
  /** false for object URLs (video, or oversized images) — session-only, never persisted. */
  persist: boolean;
}

export interface ThemePrefs {
  skin: Skin;
  mode: Mode;
  view: View;
  showSeconds: boolean;
  /** Only meaningful when skin === "custom" — the uploaded wallpaper. */
  customBg: CustomBg | null;
  /** 0 (fully see-through) – 1 (opaque) opacity of glass/chip surfaces. */
  glassOpacity: number;
}

export const THEME_DEFAULTS: ThemePrefs = {
  skin: "aurora",
  mode: "dark",
  view: "board",
  showSeconds: true,
  customBg: null,
  glassOpacity: 1,
};

export const SKIN_INFO: Record<Skin, { label: string; blurb: string; icon: string }> = {
  aurora: { label: "Aurora", blurb: "glass & gradients", icon: "✦" },
  terminal: { label: "Terminal", blurb: "green phosphor", icon: ">_" },
  zen: { label: "Zen", blurb: "barely there", icon: "◌" },
  custom: { label: "Blank", blurb: "your own wallpaper", icon: "+" },
  wallpaper1: { label: "Wallpaper 1", blurb: "built-in wallpaper", icon: "🖼️" },
  wallpaper2: { label: "Wallpaper 2", blurb: "built-in wallpaper", icon: "🖼️" },
  wallpaper3: { label: "Wallpaper 3", blurb: "built-in wallpaper", icon: "🖼️" },
  wallpaper4: { label: "Wallpaper 4", blurb: "built-in wallpaper", icon: "🖼️" },
};

/** Built-in wallpaper skins mapped to their static asset in /public. */
export const BUILTIN_WALLPAPERS: Record<string, string> = {
  wallpaper1: "/wallpaper1.jpg",
  wallpaper2: "/wallpaper2.jpg",
  wallpaper3: "/wallpaper3.jpg",
  wallpaper4: "/wallpaper4.jpg",
};

export function isWallpaperSkin(
  skin: Skin
): skin is "wallpaper1" | "wallpaper2" | "wallpaper3" | "wallpaper4" {
  return skin in BUILTIN_WALLPAPERS;
}

/** The data-skin token set a skin actually renders with — "custom" borrows zen's chrome. */
export function tokenSkin(skin: Skin): "aurora" | "terminal" | "zen" {
  return skin === "custom" || isWallpaperSkin(skin) ? "zen" : skin;
}

interface ThemeContextValue extends ThemePrefs {
  update: (patch: Partial<ThemePrefs>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

function applyToDocument(prefs: ThemePrefs) {
  const el = document.documentElement;
  el.dataset.skin = tokenSkin(prefs.skin);
  el.dataset.mode = prefs.mode;
  el.style.setProperty("--glass-opacity", String(prefs.glassOpacity ?? 1));

  // Apply built-in wallpapers.
  if (isWallpaperSkin(prefs.skin)) {
    el.style.setProperty("--custom-bg-image", `url('${BUILTIN_WALLPAPERS[prefs.skin]}')`);
  } else if (prefs.skin === "custom" && prefs.customBg?.type === "image") {
    el.style.setProperty("--custom-bg-image", `url('${prefs.customBg.url}')`);
  } else {
    el.style.removeProperty("--custom-bg-image");
  }
}

// Custom backgrounds can be sizeable data URLs — keep them out of the frequently
// round-tripped prefs blob so a huge image doesn't slow down every pref write.
const BG_KEY = "gg-bg";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ThemePrefs>(THEME_DEFAULTS);

  // Hydrate from localStorage (the layout's inline script already set the
  // data-attributes pre-paint, so there is no flash).
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("gg-prefs") ?? "{}");
      const bgRaw = localStorage.getItem(BG_KEY);
      const customBg: CustomBg | null = bgRaw ? { type: "image", url: bgRaw, persist: true } : null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefs((cur) => {
        const merged = { ...cur, ...stored, customBg } as ThemePrefs;
        applyToDocument(merged);
        return merged;
      });
    } catch {
      /* defaults are fine */
    }
  }, []);

  const update = useCallback((patch: Partial<ThemePrefs>) => {
    setPrefs((cur) => {
      const next = { ...cur, ...patch };
      applyToDocument(next);
      try {
        if ("customBg" in patch) {
          if (next.customBg?.persist && next.customBg.type === "image") {
            localStorage.setItem(BG_KEY, next.customBg.url);
          } else {
            localStorage.removeItem(BG_KEY);
          }
        }
        const { customBg: _omit, ...rest } = next;
        void _omit;
        localStorage.setItem("gg-prefs", JSON.stringify(rest));
      } catch {
        /* private mode, or quota exceeded on a big image — keep the in-memory value */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ ...prefs, update }}>{children}</ThemeContext.Provider>;
}

/** Inline script source: applies persisted skin/mode before first paint. */
export const THEME_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("gg-prefs")||"{}");var d=document.documentElement;var wp={wallpaper1:"/wallpaper1.jpg",wallpaper2:"/wallpaper2.jpg",wallpaper3:"/wallpaper3.jpg",wallpaper4:"/wallpaper4.jpg"};var sk=(p.skin==="custom"||wp[p.skin])?"zen":(p.skin||"aurora");d.dataset.skin=sk;d.dataset.mode=p.mode||"dark";d.style.setProperty("--glass-opacity",String(p.glassOpacity==null?1:p.glassOpacity));if(wp[p.skin]){d.style.setProperty("--custom-bg-image","url('"+wp[p.skin]+"')")}}catch(e){}`;