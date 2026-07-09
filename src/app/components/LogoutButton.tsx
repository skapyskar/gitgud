"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="flex items-center gap-2 text-xs font-medium px-3.5 py-2 r-md chip text-ink2 hover:text-rosy hover:!border-rosy/40 hover:!bg-rosy/10 transition-all"
      title="Sign out"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Save &amp; quit</span>
    </button>
  );
}
