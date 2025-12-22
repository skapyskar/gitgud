export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Orb */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="w-full max-w-[1920px] mx-auto space-y-6 relative z-10 animate-pulse">
        {/* Header Skeleton */}
        <header className="border-b border-green-800 pb-4 grid grid-cols-3 items-center">
          <div>
            <div className="h-10 w-72 bg-green-900/20 mb-2"></div>
          </div>
          <div className="text-center">
            <div className="h-8 w-64 bg-green-900/10 mx-auto"></div>
          </div>
          <div className="text-right">
            <div className="h-10 w-28 bg-green-900/20 ml-auto"></div>
          </div>
        </header>

        {/* Stats Panel Skeleton */}
        <div className="border border-green-900/30 p-6 bg-black/50">
          <div className="h-8 w-48 bg-green-900/20 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="h-48 bg-black/40 border border-green-500/30"></div>
            <div className="h-48 bg-black/40 border border-green-500/30"></div>
            <div className="md:col-span-2 lg:col-span-2 h-48 bg-black/40 border border-green-500/30"></div>
            <div className="h-48 bg-black/40 border border-green-500/30"></div>
          </div>
        </div>

        {/* Task Panels Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Backlog */}
          <div className="border border-green-900/30 p-4 bg-black/50 h-[500px]">
            <div className="h-6 w-32 bg-green-900/20 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-black/70 border border-yellow-700/30"></div>
              <div className="h-20 bg-black/70 border border-yellow-700/30"></div>
            </div>
          </div>

          {/* Daily Board */}
          <div className="border border-green-900/30 p-4 bg-black/50 h-[500px]">
            <div className="h-6 w-32 bg-green-900/20 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-black/70 border border-green-700/30"></div>
              <div className="h-20 bg-black/70 border border-green-700/30"></div>
            </div>
          </div>

          {/* Weekly Planner */}
          <div className="border border-green-900/30 p-4 bg-black/50 h-[500px]">
            <div className="h-6 w-32 bg-green-900/20 mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-black/70 border border-purple-700/30"></div>
              <div className="h-20 bg-black/70 border border-purple-700/30"></div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center pt-8">
          <p className="text-green-500 text-sm font-mono">
            LOADING_DASHBOARD<span className="animate-pulse">...</span>
          </p>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </main>
  );
}
