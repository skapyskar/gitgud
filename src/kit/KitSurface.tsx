"use client";

import React from "react";

/**
 * App backdrop for kit consumers outside the Next app (previews, designs).
 * Paints the theme's base surface so ink/accent tokens read correctly;
 * skin/mode props mirror the data-attributes the app sets on <html>.
 */
export function KitSurface({
  skin = "aurora",
  mode = "dark",
  padding = 24,
  children,
}: {
  skin?: "aurora" | "terminal" | "zen";
  mode?: "dark" | "light";
  padding?: number;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.mode = mode;
  }, [skin, mode]);

  return (
    <div
      style={{
        background: "var(--base)",
        color: "var(--ink)",
        minHeight: "100vh",
        padding,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

export default KitSurface;
