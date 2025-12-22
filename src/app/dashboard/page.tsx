import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import StatsPanel from "./components/StatsPanel";
import LogoutButton from "../components/LogoutButton";
import ConnectGitHubButton from "./components/ConnectGitHubButton";
import WeeklyPlanner from "./components/WeeklyPlanner";
import DailyBoard from "./components/DailyBoard";
import BacklogPanel from "./components/BacklogPanel";

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
          take: 30, // Last 30 days for full graph
        },
      },
    });

    if (!user) {
      redirect("/login");
    }

    // ✅ Check Account table for GitHub connection
    const githubAccount = await prisma.account.findFirst({
      where: { 
        userId: user.id, 
        provider: "github" 
      },
    });
    const isGitHubLinked = !!githubAccount;

    // SEPARATE TASKS BY TYPE
    const backlogTasks = user.tasks.filter(t => t.type === "BACKLOG" && !t.isCompleted);
    const weeklyTemplates = user.tasks.filter(t => t.type === "WEEKLY");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyTasks = user.tasks.filter(t => 
      t.type === "DAILY" && 
      t.scheduledDate && 
      new Date(t.scheduledDate).setHours(0, 0, 0, 0) === today.getTime()
    );

    return (
      <main className="min-h-screen p-[1vw] lg:p-[2vw] bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
        {/* Cyberpunk Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>

        {/* Glowing Orb Effect */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

        {/* CHANGE 1: CONTAINER WIDTH 
            Changed max-w-7xl to max-w-[1920px] (or w-full) to use the screen edges.
        */}
        <div className="w-full max-w-[1920px] mx-auto space-y-[1.5vh] relative z-10">
          
          {/* Header */}
          <header className="border-b border-green-800 pb-[1vh] grid grid-cols-3 items-center gap-[1vw]">
            <div>
              <h1 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold text-green-400 font-mono uppercase tracking-wider">
                Git_Gud_Dashboard
              </h1>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-[clamp(1rem,1.5vw,1.5rem)]">
                Welcome back, <span className="text-green-400 font-semibold">{user.name || user.email}</span>
              </p>
            </div>
            <div className="flex justify-end">
              <LogoutButton />
            </div>
          </header>

          {/* Stats Panel - Full Width */}
          <StatsPanel user={user} isGitHubLinked={isGitHubLinked} />

          {/* MAIN BATTLEFIELD GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-[1.5vw]">
            
            {/* COLUMN 1: THE DUMP (BACKLOG) */}
            {/* Kept at 3 (25%) */}
            <div className="lg:col-span-3 space-y-[1.5vh]">
              <BacklogPanel tasks={backlogTasks} userId={user.id} />
            </div>

            {/* COLUMN 2: DAILY OPERATIONS (CENTER) */}
            {/* CHANGE 2: GRID RATIO 
                Reduced from 6 to 5. The center usually has less density than the side panels.
            */}
            <div className="lg:col-span-5 space-y-[1.5vh]">
              <DailyBoard dailyTasks={dailyTasks} weeklyTemplates={weeklyTemplates} userId={user.id} />
            </div>

            {/* COLUMN 3: WEEKLY TEMPLATES (RIGHT) */}
            {/* CHANGE 3: GRID RATIO
                Increased from 3 to 4. This gives your weekly templates 33% grid width instead of 25%.
            */}
            <div className="lg:col-span-4 space-y-[1.5vh]">
              <WeeklyPlanner templates={weeklyTemplates} userId={user.id} />
            </div>
          </div>
        </div>

        {/* Scanline Effect */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
      </main>
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    redirect("/login");
  }
}