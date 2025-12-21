export default function RootLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Orb Effect */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10 text-center space-y-8">
        {/* Logo Animation */}
        <div className="space-y-4 animate-pulse">
          <h1 className="text-6xl md:text-8xl font-bold text-green-400 tracking-tighter uppercase font-mono">
            Git_Gud<span className="animate-pulse">_</span>
          </h1>
          <p className="text-green-600 text-sm md:text-base font-mono tracking-widest">
            {'>'} SYSTEM.INITIALIZING...
          </p>
        </div>

        {/* Loading Dots */}
        <div className="flex gap-3 justify-center">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:100ms]"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce [animation-delay:200ms]"></div>
        </div>

        {/* Progress Bar */}
        <div className="w-64 h-1 bg-green-900/30 mx-auto overflow-hidden">
          <div className="h-full bg-green-500 animate-loading shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
        </div>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </main>
  );
}