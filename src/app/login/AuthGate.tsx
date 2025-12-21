"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function AuthGate() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleLogin = (provider: "google" | "github", forceSwitch: boolean = false) => {
    setIsLoading(provider);
    
    // The specific params to force the account chooser
    const options: any = { callbackUrl: "/dashboard" };
    
    if (forceSwitch) {
      if (provider === "google") {
        options.authorization = { params: { prompt: "select_account" } };
      }
      // GitHub doesn't strictly support 'prompt: select_account' in the same standard way 
      // via next-auth config easily without overrides, but Google does.
    }

    signIn(provider, options);
  };

  return (
    <div className="w-full max-w-md bg-[#050505] border border-green-800 p-8 relative overflow-hidden shadow-[0_0_20px_rgba(0,255,0,0.1)]">
      
      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 bg-green-500"></div>
      <div className="absolute top-0 right-0 w-2 h-2 bg-green-500"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 bg-green-500"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500"></div>

      <div className="space-y-8 text-center">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase glitch-text">
          Identify_User
        </h2>

        <div className="space-y-4">
          
          {/* OPTION 1: GOOGLE */}
          <button
            onClick={() => handleLogin("google")}
            disabled={!!isLoading}
            className="w-full group relative px-6 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-all duration-300"
          >
             <div className="flex items-center justify-center gap-3">
               {/* Simple Google 'G' Icon */}
               <svg className="w-5 h-5" viewBox="0 0 24 24">
                 <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                 <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                 <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                 <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
               </svg>
               {isLoading === "google" ? "CONNECTING..." : "Login via Google"}
             </div>
          </button>

          {/* OPTION 2: GITHUB */}
          <button
            onClick={() => handleLogin("github")}
            disabled={!!isLoading}
            className="w-full group relative px-6 py-3 bg-green-900/20 border border-green-600 text-green-400 font-bold uppercase tracking-widest hover:bg-green-500 hover:text-black transition-all duration-300"
          >
             <div className="flex items-center justify-center gap-3">
               <span>github.exe</span>
               {isLoading === "github" && <span className="animate-pulse">_</span>}
             </div>
          </button>
        </div>

        {/* SWITCH ACCOUNT LOGIC */}
        <div className="pt-6 border-t border-green-900/50">
          <p className="text-[10px] text-gray-500 mb-2">WRONG_CREDENTIALS?</p>
          <button
            onClick={() => handleLogin("google", true)}
            className="text-xs text-red-400 hover:text-red-500 hover:underline uppercase tracking-widest"
          >
            [ Force_Switch_Google_Account ]
          </button>
        </div>
      </div>
    </div>
  );
}