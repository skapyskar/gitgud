// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Orb Effect */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10 text-center space-y-8 p-8">
        {/* Title with Glitch Effect */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-bold text-green-400 tracking-tighter uppercase font-mono glitch-text">
            Git_Gud<span className="animate-pulse">_</span>
          </h1>
          <p className="text-green-600 text-sm md:text-base font-mono tracking-widest animate-pulse">
            {'>'} PRODUCTIVITY.PROTOCOL.INITIALIZED
          </p>
        </div>

        {/* Dynamic Button based on Auth Status */}
        <div className="pt-8">
          {session ? (
            <Link
              href="/dashboard"
              className="
                group relative px-8 py-4 bg-transparent 
                border border-green-500 text-green-500 
                font-mono text-xl uppercase tracking-widest
                hover:bg-green-500 hover:text-black 
                transition-all duration-300
                shadow-[0_0_10px_rgba(0,255,0,0.2)]
                hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]
                inline-block
              "
            >
              <span className="absolute inset-0 w-full h-full border-t border-b border-transparent group-hover:border-green-900 scale-y-110 transition-transform"></span>
              <span className="relative">[ ENTER_SYSTEM ]</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="
                group relative px-8 py-4 bg-transparent 
                border border-green-500 text-green-500 
                font-mono text-xl uppercase tracking-widest
                hover:bg-green-500 hover:text-black 
                transition-all duration-300
                shadow-[0_0_10px_rgba(0,255,0,0.2)]
                hover:shadow-[0_0_20px_rgba(0,255,0,0.6)]
                inline-block
              "
            >
              <span className="absolute inset-0 w-full h-full border-t border-b border-transparent group-hover:border-green-900 scale-y-110 transition-transform"></span>
              <span className="relative">[ INITIALIZE_CONNECTION ]</span>
            </Link>
          )}
        </div>

        {/* Status Indicator */}
        <div className="pt-4">
          {session ? (
            <p className="text-gray-500 text-xs font-mono flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              SESSION_ACTIVE // USER: {session.user?.name || session.user?.email}
            </p>
          ) : (
            <p className="text-gray-600 text-xs font-mono">
              [ ACCESS_RESTRICTED // AUTHORIZATION_REQUIRED ]
            </p>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="border border-green-900/30 bg-black/50 p-4 backdrop-blur-sm">
            <div className="text-green-500 text-2xl mb-2">⚡</div>
            <h3 className="text-green-400 font-mono text-sm uppercase mb-1">TASK_TRACKING</h3>
            <p className="text-gray-600 text-xs font-mono">Real-time productivity monitoring</p>
          </div>
          <div className="border border-green-900/30 bg-black/50 p-4 backdrop-blur-sm">
            <div className="text-green-500 text-2xl mb-2">📊</div>
            <h3 className="text-green-400 font-mono text-sm uppercase mb-1">XP_SYSTEM</h3>
            <p className="text-gray-600 text-xs font-mono">Gamified progress tracking</p>
          </div>
          <div className="border border-green-900/30 bg-black/50 p-4 backdrop-blur-sm">
            <div className="text-green-500 text-2xl mb-2">🔗</div>
            <h3 className="text-green-400 font-mono text-sm uppercase mb-1">GIT_INTEGRATION</h3>
            <p className="text-gray-600 text-xs font-mono">Automated commit tracking</p>
          </div>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </main>
  );
}