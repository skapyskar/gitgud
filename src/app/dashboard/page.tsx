import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureTodayLog } from "@/lib/api";
import { dayStart } from "@/lib/dates";
import { computeFamRankingScore } from "@/lib/fam";
import { levelFromXP } from "@/lib/gamification";
import RewardProvider from "../components/RewardLayer";
import DashboardShell from "./components/DashboardShell";
import type { FamSummaryData } from "../fam/components/FamSummaryCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }

  const baseUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!baseUser) {
    redirect("/login");
  }

  // Seed today's log (adds active habits to today's possible XP, once per day).
  await ensureTodayLog(baseUser.id);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: baseUser.id },
    include: {
      tasks: { orderBy: { createdAt: "desc" } },
      dayLogs: { orderBy: { date: "desc" }, take: 120 },
    },
  });

  if (!user.username) {
    redirect("/complete-profile");
  }

  const githubAccount = await prisma.account.findFirst({
    where: { userId: user.id, provider: "github" },
    select: { id: true },
  });

  // Dashboard Fam summary card: prefer a Fam the user owns, else their earliest membership.
  const myMemberships = await prisma.famMembership.findMany({
    where: { userId: user.id },
    orderBy: { joinedAt: "asc" },
    include: { fam: true },
  });
  const primaryMembership =
    myMemberships.find((m) => m.role === "OWNER") ?? myMemberships[0] ?? null;

  let famSummary: FamSummaryData | null = null;
  if (primaryMembership) {
    const today = dayStart();
    const famMembers = await prisma.famMembership.findMany({
      where: { famId: primaryMembership.famId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            xp: true,
            dayLogs: { where: { date: today }, take: 1 },
          },
        },
      },
    });

    // Fam.xp/Fam.level in the schema are never incremented anywhere (task
    // completion isn't coupled to Fam membership) — lifetime Fam XP is
    // computed live as the sum of members' User.xp instead.
    const lifetimeXP = famMembers.reduce((sum, m) => sum + m.user.xp, 0);

    const leaderboard = famMembers
      .map((m) => ({
        userId: m.user.id,
        label: m.user.username ? `@${m.user.username}` : m.user.name || "Member",
        points: m.user.dayLogs[0]?.totalXP ?? 0,
        isMe: m.user.id === user.id,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);

    const [recentActivity, topGoal, rankingScore] = await Promise.all([
      prisma.famActivity.findMany({
        where: { famId: primaryMembership.famId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, message: true },
      }),
      prisma.famGoal.findFirst({
        where: { famId: primaryMembership.famId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true, description: true, currentValue: true, targetValue: true },
      }),
      computeFamRankingScore(primaryMembership.famId, 7),
    ]);

    famSummary = {
      id: primaryMembership.fam.id,
      name: primaryMembership.fam.name,
      level: levelFromXP(lifetimeXP),
      xp: lifetimeXP,
      score: Math.round(rankingScore.score),
      leaderboard,
      recentActivity: recentActivity.map((a) => a.message),
      activeGoal: topGoal,
    };
  }

  return (
    <RewardProvider>
      <DashboardShell
        user={{
          name: user.name,
          username: user.username,
          email: user.email,
          xp: user.xp,
          streakDays: user.streakDays,
          coins: user.coins,
        }}
        dayLogs={user.dayLogs}
        backlogTasks={user.tasks.filter((t) => t.type === "BACKLOG")}
        weeklyTemplates={user.tasks.filter((t) => t.type === "WEEKLY")}
        dailyTasks={user.tasks.filter((t) => t.type === "DAILY" && t.scheduledDate)}
        isGitHubLinked={!!githubAccount}
        famSummary={famSummary}
      />
    </RewardProvider>
  );
}
