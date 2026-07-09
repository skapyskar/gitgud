"use client";

import React, { useEffect, useRef, useState } from "react";

/**
 * Fades a section up into place the first time it scrolls into view.
 * Wraps children in a plain div so it composes with any layout.
 */
export default function Reveal({
  delay = 0,
  className = "",
  style,
  children,
}: {
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    // Safety net: anything already on-screen at mount (small viewports, fast
    // scroll) gets revealed even if the observer's first tick is delayed.
    const safety = setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) setShown(true);
    }, 400);
    return () => {
      io.disconnect();
      clearTimeout(safety);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${shown ? "animate-rise" : "opacity-0"} ${className}`}
      style={shown ? { ...style, animationDelay: `${delay}ms` } : style}
    >
      {children}
    </div>
  );
}
