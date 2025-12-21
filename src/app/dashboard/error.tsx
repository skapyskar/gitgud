"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-gray-900 to-black relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Glowing Red Orb Effect */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative z-10 text-center space-y-6 border border-red-500 p-8 bg-red-900/10 backdrop-blur-sm max-w-md">
        {/* Error Icon */}
        <div className="text-red-500 text-6xl animate-pulse">⚠️</div>

        {/* Error Title */}
        <h2 className="text-red-500 text-2xl font-mono uppercase tracking-wider">
          SYSTEM_ERROR
        </h2>

        {/* Error Message */}
        <div className="border-t border-red-900 pt-4">
          <p className="text-gray-400 font-mono text-sm">
            {error.message || "An unexpected error occurred in the dashboard"}
          </p>
          {error.digest && (
            <p className="text-gray-600 font-mono text-xs mt-2">
              ERROR_ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={reset}
            className="
              border border-red-500 text-red-500 px-6 py-3 
              font-mono uppercase tracking-widest text-sm
              hover:bg-red-500 hover:text-black 
              transition-all duration-300
              shadow-[0_0_10px_rgba(255,0,0,0.2)]
              hover:shadow-[0_0_20px_rgba(255,0,0,0.6)]
            "
          >
            [ REBOOT_SYSTEM ]
          </button>

          <a
            href="/dashboard"
            className="
              border border-gray-700 text-gray-500 px-6 py-3 
              font-mono uppercase tracking-widest text-xs
              hover:bg-gray-700 hover:text-white 
              transition-all duration-300
            "
          >
            [ RETURN_TO_DASHBOARD ]
          </a>
        </div>

        {/* Footer */}
        <p className="text-gray-700 text-xs font-mono mt-6">
          CRITICAL_FAILURE // RECOVERY_MODE_ACTIVE
        </p>
      </div>

      {/* Scanline Effect */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.3)_50%)] bg-[length:100%_4px] animate-scan"></div>
    </div>
  );
}