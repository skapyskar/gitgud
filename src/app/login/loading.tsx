export default function LoginLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,65,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Orb Effect */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10 text-center space-y-8 p-8 animate-pulse">
        {/* Title Skeleton */}
        <div className="space-y-4">
          <div className="h-20 w-64 bg-green-900/20 mx-auto"></div>
          <div className="h-4 w-80 bg-green-900/10 mx-auto"></div>
        </div>

        {/* Button Skeletons */}
        <div className="pt-8 space-y-4">
          <div className="h-16 w-80 bg-green-900/20 mx-auto"></div>
          <div className="h-16 w-80 bg-blue-900/20 mx-auto"></div>
        </div>

        {/* Loading Text */}
        <p className="text-green-500 text-sm font-mono mt-8">
          AUTHENTICATING<span className="animate-pulse">...</span>
        </p>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </main>
  );
}