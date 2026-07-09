import React from "react";

interface GitGudLogoProps {
  className?: string;
  withText?: boolean;
}

/** Rising-bars logo — a commit graph climbing off the chart. */
export const GitGudLogo: React.FC<GitGudLogoProps> = ({
  className = "w-12 h-12",
  withText = false,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_0_10px_var(--glow,rgba(167,139,250,0.6))]"
        aria-label="GIT GUD logo"
      >
        <defs>
          <linearGradient id="ggGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--acc, #8b5cf6)" />
            <stop offset="55%" stopColor="var(--acc2, #d946ef)" />
            <stop offset="100%" stopColor="var(--acc3, #22d3ee)" />
          </linearGradient>
        </defs>
        <g fill="url(#ggGrad)">
          <rect x="10" y="60" width="20" height="40" rx="6" />
          <rect x="40" y="35" width="20" height="65" rx="6" />
          <rect x="70" y="20" width="20" height="80" rx="6" />
          <circle cx="80" cy="10" r="9" />
        </g>
      </svg>
      {withText && (
        <span className="font-display font-extrabold text-2xl lg:text-3xl tracking-tight whitespace-nowrap grad-text">
          GIT GUD
        </span>
      )}
    </div>
  );
};

export default GitGudLogo;
