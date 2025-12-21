import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import StatsPanel from "./components/StatsPanel";
import LogoutButton from "../components/LogoutButton";
import ConnectGitHubButton from "./components/ConnectGitHubButton";

export default async function DashboardPage() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      redirect("/login");
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        tasks: {
          where: { isCompleted: false },
          orderBy: { plannedDate: "asc" },
        },
      },
    });

    if (!user) {
      redirect("/login");
    }

    // ✅ FIXED: Check Account table instead of image URL
    const githubAccount = await prisma.account.findFirst({
      where: { 
        userId: user.id, 
        provider: "github" 
      },
    });
    const isGitHubLinked = !!githubAccount;

    return (
      <main className="min-h-screen p-8 bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
        {/* Cyberpunk Grid Background */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>

        {/* Glowing Orb Effect */}
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          {/* Header */}
          <header className="border-b border-green-800 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-green-400 font-mono uppercase tracking-wider">
                Git_Gud_Dashboard
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Welcome back, <span className="text-green-500">{user.name || user.email}</span>
              </p>
            </div>
            <LogoutButton />
          </header>

          {/* GitHub Warning */}
          {!isGitHubLinked && (
            <div className="border border-yellow-700 bg-yellow-900/10 p-4 flex items-center justify-between">
              <div>
                <p className="text-yellow-500 font-mono text-sm">
                  ⚠️ GitHub not connected - Commit tracking disabled
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  Link your GitHub account to track commits automatically
                </p>
              </div>
              <ConnectGitHubButton />
            </div>
          )}

          {/* Stats & Task Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats Panel */}
            <div className="md:col-span-1">
              <StatsPanel user={user} />
            </div>

            {/* Task Form */}
            <div className="md:col-span-2 bg-[#111] border border-green-800 p-4">
              <h2 className="text-green-500 text-xs uppercase mb-4 tracking-widest">
                // Create_New_Task
              </h2>
              <TaskForm />
            </div>
          </div>

          {/* Task List */}
          <section className="bg-[#0a0a0a] border border-green-900 p-6 min-h-[300px]">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <h2 className="text-green-500 text-sm uppercase tracking-widest">
                Active_Protocols
              </h2>
            </div>
            <TaskList tasks={user.tasks} />
          </section>
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