import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureTodayLog } from "@/lib/api";
import RewardProvider from "../components/RewardLayer";
import DashboardShell from "./components/DashboardShell";

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

  const githubAccount = await prisma.account.findFirst({
    where: { userId: user.id, provider: "github" },
    select: { id: true },
  });

  return (
    <RewardProvider>
      <DashboardShell
        user={{
          name: user.name,
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
      />
    </RewardProvider>
  );
}
