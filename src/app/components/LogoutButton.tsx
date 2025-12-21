"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: "/" })} 
      className="text-xs text-gray-500 hover:text-red-500 hover:underline transition-colors uppercase tracking-widest"
    >
      [ TERMINATE_SESSION ]
    </button>
  );
}