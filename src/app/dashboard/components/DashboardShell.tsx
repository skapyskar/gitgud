"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Swords, Lightbulb, Users } from "lucide-react";
import type { Task, DayLog } from "../../../../prisma/generated/client";
import { useTheme } from "../../components/theme";
import FlashToastProvider from "./FlashToast";
import CursorFx from "./CursorFx";
import Overview from "./Overview";
import TheGrind from "./TheGrind";
import { levelFromXP } from "@/lib/gamification";
import type { FamSummaryData } from "../../fam/components/FamSummaryCard";

interface DashboardShellProps {
  user: { name: string | null; username: string | null; email: string; xp: number; streakDays: number; coins: number };
  dayLogs: DayLog[];
  backlogTasks: Task[];
  weeklyTemplates: Task[];
  dailyTasks: Task[];
  isGitHubLinked: boolean;
  famSummary: FamSummaryData | null;
}

/**
 * Two-page snap-scroll dashboard: Overview (clock, missions, momentum,
 * profile, audio dock) flows straight into The Grind (habits, brain dump).
 */
export default function DashboardShell({ user, dayLogs, backlogTasks, weeklyTemplates, dailyTasks, famSummary }: DashboardShellProps) {
  const router = useRouter();
  const { skin, customBg } = useTheme();
  const [activePage, setActivePage] = useState<0 | 1>(0);

  const dashRef = useRef<HTMLDivElement>(null);
  const grindRef = useRef<HTMLDivElement>(null);
  const dumpRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);

  const level = levelFromXP(user.xp);
  const showAurora = !(skin === "custom" && !!customBg);

  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return;
    window.scrollTo({ top: ref.current.offsetTop - 6, behavior: "smooth" });
  };

  const handleNav = (target: "dash" | "grind" | "dump" | "fam") => {
    if (target === "fam") {
      router.push("/fam");
      return;
    }
    scrollToRef(target === "dash" ? dashRef : target === "grind" ? grindRef : dumpRef);
  };

  // Page-level scroll-snap for the duration this dashboard is mounted.
  useEffect(() => {
    const de = document.documentElement;
    const prevSnap = de.style.scrollSnapType;
    const prevBehavior = de.style.scrollBehavior;
    de.style.scrollSnapType = "y mandatory";
    de.style.scrollBehavior = "smooth";
    return () => {
      de.style.scrollSnapType = prevSnap;
      de.style.scrollBehavior = prevBehavior;
    };
  }, []);

  // Aurora parallax + active-page tracking for the mobile nav highlight.
  useEffect(() => {
    const onScroll = () => {
      if (auroraRef.current) auroraRef.current.style.transform = `translateY(${window.scrollY * 0.16}px)`;
      if (grindRef.current) {
        const next: 0 | 1 = window.scrollY > grindRef.current.offsetTop - window.innerHeight * 0.55 ? 1 : 0;
        setActivePage((prev) => (prev === next ? prev : next));
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mobileNav: Array<{ label: string; icon: typeof Swords; active: boolean; target: "dash" | "grind" | "dump" | "fam" }> = [
    { label: "Overview", icon: LayoutDashboard, active: activePage === 0, target: "dash" },
    { label: "Habits", icon: Swords, active: activePage === 1, target: "grind" },
    { label: "Dump", icon: Lightbulb, active: activePage === 1, target: "dump" },
    { label: "Fam", icon: Users, active: false, target: "fam" },
  ];

  return (
    <FlashToastProvider>
      <main className="relative">
        {showAurora && <div ref={auroraRef} className="aurora" />}
        <div className="noise" />
        <CursorFx />

        <div ref={dashRef}>
          <Overview
            user={{ name: user.name, username: user.username, email: user.email, xp: user.xp, streakDays: user.streakDays }}
            dayLogs={dayLogs}
            dailyTasks={dailyTasks}
            weeklyTemplates={weeklyTemplates}
            backlogTasks={backlogTasks}
            famSummary={famSummary}
            onNavGrind={() => scrollToRef(grindRef)}
            onNavDump={() => scrollToRef(dumpRef)}
          />
        </div>

        <div ref={grindRef}>
          <TheGrind
            level={level}
            weeklyTemplates={weeklyTemplates}
            backlogTasks={backlogTasks}
            dailyTasks={dailyTasks}
            onNavDash={() => scrollToRef(dashRef)}
            dumpRef={dumpRef}
          />
        </div>

        {/* Phone bottom navigation */}
        <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 glass r-xl px-2 py-1.5 flex gap-1 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          {mobileNav.map((tab) => (
            <button
              key={tab.label}
              onClick={() => handleNav(tab.target)}
              className={`flex flex-col items-center gap-0.5 px-5 py-1.5 r-lg transition-all ${
                tab.active ? "grad-primary text-white glow-shadow" : "text-ink3 hover:text-ink"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </FlashToastProvider>
  );
}
