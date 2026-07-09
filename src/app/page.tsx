import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Zap, Flame, Repeat, Trophy, ArrowRight, Sparkles } from "lucide-react";
import { GitGudLogo } from "./components/GitGudLogo";

export default async function Home() {
  const session = await getServerSession(authOptions);

  const features = [
    {
      icon: Zap,
      tint: "from-violet-500 to-fuchsia-500 shadow-fuchsia-500/30",
      title: "XP for everything",
      body: "Every task has a tier and a reward. Beat your time limit for +25% XP.",
    },
    {
      icon: Flame,
      tint: "from-amber-400 to-orange-500 shadow-orange-500/30",
      title: "Streak multipliers",
      body: "Show up daily and stack up to a ×2 multiplier. Miss a day, lose the flame.",
    },
    {
      icon: Repeat,
      tint: "from-cyan-400 to-sky-500 shadow-cyan-500/30",
      title: "Habits that respawn",
      body: "Weekly templates spawn fresh missions on schedule — with bonus XP.",
    },
    {
      icon: Trophy,
      tint: "from-emerald-400 to-teal-500 shadow-emerald-500/30",
      title: "Ranks & levels",
      body: "Climb from Script Kiddie to The Compiler. Your grind, visualized.",
    },
  ];

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="aurora" />
      <div className="noise" />

      <div className="relative z-10 text-center px-6 py-16 max-w-5xl mx-auto">
        <div className="animate-rise flex flex-col items-center gap-6">
          <div className="animate-float">
            <GitGudLogo className="w-24 h-24 md:w-28 md:h-28" />
          </div>

          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-ink2">
            <Sparkles className="w-3.5 h-3.5 text-acc2" />
            productivity, but it plays like a game
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-extrabold tracking-tight leading-[0.95]">
            <span className="text-ink">Level up</span>
            <br />
            <span className="grad-text">your life.</span>
          </h1>

          <p className="text-ink2 text-base md:text-lg max-w-xl leading-relaxed">
            Turn your to-do list into a game you actually want to play — XP, streaks,
            ranks, and habits that respawn.
          </p>

          <div className="flex flex-col items-center gap-3 mt-2">
            <Link
              href={session ? "/dashboard" : "/login"}
              className="group inline-flex items-center gap-2.5 px-8 py-4 r-lg grad-primary text-white font-display font-bold text-lg glow-shadow hover:brightness-110 hover:-translate-y-0.5 transition-all"
            >
              {session ? "Enter the game" : "Press start"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-ink3 text-xs">
              {session ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 bg-acc rounded-full animate-pulse" />
                  signed in as {session.user?.name || session.user?.email}
                </span>
              ) : (
                "free · sign in with GitHub or Google"
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="glass glass-hover r-xl p-5 text-left animate-rise"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <div
                className={`w-11 h-11 r-lg bg-gradient-to-br ${f.tint} shadow-lg flex items-center justify-center mb-4`}
              >
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-display font-semibold text-ink text-[15px] mb-1.5">
                {f.title}
              </h3>
              <p className="text-ink2 text-[13px] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
