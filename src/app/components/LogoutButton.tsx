"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/" })} 
      className="text-base px-4 py-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 border border-red-900/30 hover:border-red-500/50 transition-all uppercase tracking-widest font-mono"
    >
      [ TERMINATE_SESSION ]
    </button>
  );
}