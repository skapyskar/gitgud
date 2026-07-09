"use client";

import { useEffect, useRef } from "react";

/** Custom lerped cursor ring + dot, desktop pointer devices only. Pure polish. */
export default function CursorFx() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !finePointer) return;

    let mx = -100;
    let my = -100;
    let rx = -100;
    let ry = -100;
    let hov = false;
    let seen = false;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!seen) {
        seen = true;
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (ringRef.current) ringRef.current.style.opacity = "0.85";
      }
      const target = e.target as HTMLElement | null;
      hov = !!target?.closest?.("button,input,[data-hov],a");
    };
    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
      seen = false;
    };

    document.documentElement.style.cursor = "none";
    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      const s = hov ? 1.55 : 1;
      if (dotRef.current) dotRef.current.style.transform = `translate(${mx - 3.5}px,${my - 3.5}px)`;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${rx - 17}px,${ry - 17}px) scale(${s})`;
        ringRef.current.style.background = hov ? "color-mix(in srgb, var(--acc) 12%, transparent)" : "transparent";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      document.documentElement.style.cursor = "";
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        className="fixed left-0 top-0 w-[34px] h-[34px] rounded-full pointer-events-none opacity-0 transition-opacity duration-300"
        style={{ border: "1.5px solid var(--acc)", zIndex: 9999 }}
      />
      <div
        ref={dotRef}
        className="fixed left-0 top-0 w-[7px] h-[7px] rounded-full pointer-events-none opacity-0 transition-opacity duration-300"
        style={{ background: "var(--acc2)", boxShadow: "0 0 10px var(--acc2)", zIndex: 9999 }}
      />
    </>
  );
}
