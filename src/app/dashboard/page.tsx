import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import StatsPanel from "./components/StatsPanel";
import LogoutButton from "../components/LogoutButton";
import WeeklyPlanner from "./components/WeeklyPlanner";
import DailyBoard from "./components/DailyBoard";
import BacklogPanel from "./components/BacklogPanel";
import { GitGudLogo } from "../components/GitGudLogo";
/*hjbaskabkjsc*/
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      redirect("/login");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        tasks: true,
        dayLogs: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    if (!user) {
      redirect("/login");
    }
    const githubAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: "github"
      },
    });
    const isGitHubLinked = !!githubAccount;

    const backlogTasks = user.tasks.filter(t => t.type === "BACKLOG" && !t.isCompleted);
    const weeklyTemplates = user.tasks.filter(t => t.type === "WEEKLY");

    const todayISO = new Date().toISOString().slice(0, 10);
    console.log('[Dashboard] Total tasks:', user.tasks.length);
    console.log('[Dashboard] Daily type tasks:', user.tasks.filter(t => t.type === "DAILY").map(t => ({
      id: t.id.slice(0, 8),
      title: t.title,
      scheduledDate: t.scheduledDate,
      scheduledDateISO: t.scheduledDate ? new Date(t.scheduledDate).toISOString().slice(0, 10) : null,
      matches: t.scheduledDate ? new Date(t.scheduledDate).toISOString().slice(0, 10) === todayISO : false
    })));
    const dailyTasks = user.tasks.filter(t =>
      t.type === "DAILY" && t.scheduledDate
    );
    console.log('[Dashboard] Filtered daily tasks count:', dailyTasks.length);


    return (
      <main className="min-h-screen p-[0.2vw] lg:p-[0.4vw] bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="w-full max-w-[1720px] mx-auto relative z-10 px-0 lg:px-[0.5vw]">
          <header className="border-b border-green-800 pb-[0.2vh] grid grid-cols-3 items-center gap-[1vw] mb-[0.3vh]">
            <div className="flex items-center gap-3">
              <GitGudLogo className="w-8 h-8 lg:w-10 lg:h-10 text-green-500" withText={true} />
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-[clamp(0.5rem,0.8vw,0.875rem)] lg:text-[clamp(0.625rem,0.9vw,1rem)]">
                Welcome back, <span className="text-green-400 font-semibold">{user.name || user.email}</span>
              </p>
            </div>
            <div className="flex justify-end">
              <LogoutButton />
            </div>
          </header>

          <div className="mb-[0.5vh] lg:mb-[2.5vh]">
            <StatsPanel
              key={`stats-${user.dayLogs?.[0]?.totalXP ?? 0}-${user.dayLogs?.[0]?.possibleXP ?? 0}-${user.dayLogs?.[0]?.tasksDone ?? 0}`}
              user={user}
              isGitHubLinked={isGitHubLinked}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1vw]">
            <div className="lg:col-span-3 space-y-[0.5vh]">
              <BacklogPanel tasks={backlogTasks} userId={user.id} />
            </div>
            <div className="lg:col-span-5 space-y-[1.5vh]">
              <DailyBoard dailyTasks={dailyTasks} weeklyTemplates={weeklyTemplates} userId={user.id} />
            </div>
            <div className="lg:col-span-4 space-y-[1.5vh]">
              <WeeklyPlanner templates={weeklyTemplates} userId={user.id} />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
      </main>
    );
  } catch (error) {
    if ((error as Error).message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Dashboard error:", error);
    redirect("/login");
  }
}