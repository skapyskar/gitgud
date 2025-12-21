export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Orb */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header Skeleton */}
        <header className="border-b border-green-800 pb-4 flex justify-between items-center animate-pulse">
          <div>
            <div className="h-12 w-48 bg-green-900/20 mb-2"></div>
            <div className="h-4 w-64 bg-green-900/10"></div>
          </div>
          <div className="h-10 w-24 bg-green-900/20"></div>
        </header>

        {/* Stats & Form Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Panel */}
          <div className="md:col-span-1 bg-black border border-green-600 p-4 h-64 animate-pulse">
            <div className="space-y-4">
              <div className="h-8 w-24 bg-green-900/20"></div>
              <div className="h-12 w-32 bg-green-900/20"></div>
              <div className="border-t border-gray-800 pt-4">
                <div className="h-8 w-28 bg-green-900/20 mb-2"></div>
                <div className="h-1 w-full bg-green-900/30"></div>
              </div>
            </div>
          </div>

          {/* Form Skeleton */}
          <div className="md:col-span-2 bg-[#111] border border-green-800 p-4 animate-pulse">
            <div className="h-6 w-48 bg-green-900/20 mb-4"></div>
            <div className="space-y-4">
              <div className="h-10 w-full bg-green-900/10"></div>
              <div className="flex gap-4">
                <div className="h-10 flex-1 bg-green-900/10"></div>
                <div className="h-10 flex-1 bg-green-900/10"></div>
              </div>
              <div className="h-10 w-full bg-green-700/20"></div>
            </div>
          </div>
        </div>

        {/* Task List Skeleton */}
        <section className="bg-[#0a0a0a] border border-green-900 p-6 min-h-[300px]">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            <div className="h-6 w-48 bg-green-900/20 animate-pulse"></div>
          </div>
          
          {/* Loading Animation */}
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-green-500 text-4xl font-mono mb-4 animate-pulse">
              LOADING<span className="animate-pulse">_</span>
            </div>
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-gray-600 text-xs font-mono mt-4">
              INITIALIZING_PROTOCOLS...
            </p>
          </div>

          {/* Task Skeletons */}
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border-l-2 border-gray-700 bg-[#111] animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-8 bg-gray-800"></div>
                  <div className="h-4 w-48 bg-gray-800"></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 bg-gray-800"></div>
                  <div className="h-8 w-20 bg-gray-800"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </main>
  );
}