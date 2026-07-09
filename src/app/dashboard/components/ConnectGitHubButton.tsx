"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Github } from "lucide-react";

export default function ConnectGitHubButton() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      onClick={() => {
        setIsLoading(true);
        signIn("github", { callbackUrl: "/dashboard" });
      }}
      disabled={isLoading}
      className="flex items-center gap-1.5 text-[11px] font-medium text-gold border border-gold/30 bg-gold/10 hover:bg-gold/20 r-md px-2.5 py-1 transition-all disabled:opacity-50"
    >
      <Github className="w-3.5 h-3.5" />
      {isLoading ? "linking…" : "link GitHub"}
    </button>
  );
}
