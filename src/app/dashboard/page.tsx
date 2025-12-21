import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import TaskForm from "./components/TaskForm";
import TaskList from "./components/TaskList";
import StatsPanel from "./components/StatsPanel";
import LogoutButton from "../components/LogoutButton";
import ConnectGitHubButton from "./components/ConnectGitHubButton";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  
  console.log("Dashboard session:", session); // Debug log
  
  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user!.email! },
    include: { tasks: { orderBy: { createdAt: 'desc' } } },
  });

  // Check if GitHub is linked - GitHub always provides an avatar
  const isGitHubLinked = !!user?.image;

  return (
    <main className="min-h-screen p-8 text-green-400 selection:bg-green-900 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-green-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter uppercase glitch-text">
              Git_Gud<span className="animate-pulse">_</span>
            </h1>
            <p className="text-xs text-green-600 mt-1">SYSTEM ONLINE // USER: {user?.name || session.user?.email}</p>
          </div>
          <div className="text-right">
             <LogoutButton />
          </div>
        </header>

        {/* WARNING: MISSING GITHUB LINK */}
        {!isGitHubLinked && (
          <div className="border border-yellow-600/50 bg-yellow-900/10 p-4 relative overflow-hidden">
             <div className="absolute inset-0 opacity-5 pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#fbbf24_10px,#fbbf24_20px)]"></div>
             
             <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
               <div>
                 <h3 className="text-yellow-500 font-bold uppercase text-sm flex items-center gap-2">
                   <span className="animate-pulse">⚠️</span> DATA_STREAM_INTERRUPTED
                 </h3>
                 <p className="text-xs text-yellow-200/60 mt-1 max-w-md font-mono">
                   GitHub integration is required to calculate XP from commits.
                   System is currently running in MANUAL_MODE.
                 </p>
               </div>
               <ConnectGitHubButton />
             </div>
          </div>
        )}

        {/* Top Section: Stats & Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <StatsPanel user={user} />
          </div>
          <div className="md:col-span-2">
            <div className="bg-[#111] border border-green-800 p-4 h-full relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-green-700 opacity-50"></div>
               <h3 className="text-lg mb-4 border-b border-gray-800 pb-2 text-gray-400">
                 {'>'} INITIATE_PROTOCOL
               </h3>
               <TaskForm />
            </div>
          </div>
        </div>

        {/* Task List */}
        <section className="bg-[#0a0a0a] border border-green-900 p-6 min-h-[300px]">
          <h2 className="text-xl mb-6 text-green-500 font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            ACTIVE_PROCESSES
          </h2>
          <TaskList tasks={user?.tasks} />
        </section>
      </div>
    </main>
  );
}