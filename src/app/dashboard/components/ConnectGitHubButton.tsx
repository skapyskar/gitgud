"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function ConnectGitHubButton() {
  const [isLoading, setIsLoading] = useState(false);

  const linkGithub = () => {
    setIsLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <button
      onClick={linkGithub}
      disabled={isLoading}
      className="
        bg-yellow-600/20 border border-yellow-600 text-yellow-500 
        px-4 py-2 text-xs uppercase tracking-widest font-bold
        hover:bg-yellow-500 hover:text-black transition-all
        flex items-center gap-2
      "
    >
      {isLoading ? (
        <span>ESTABLISHING_UPLINK...</span>
      ) : (
        <>
          <span>[ LINK_GITHUB_ACCOUNT ]</span>
        </>
      )}
    </button>
  );
}