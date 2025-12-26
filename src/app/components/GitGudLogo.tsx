import React from "react";

interface GitGudLogoProps {
    className?: string;
    withText?: boolean;
}

export const GitGudLogo: React.FC<GitGudLogoProps> = ({
    className = "w-12 h-12 text-green-500",
    withText = false
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg
                viewBox="0 0 100 100"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" // Neon Glow
                aria-label="GitGud Logo"
            >
                {/* BAR 1: The Start (Low) */}
                <rect x="10" y="60" width="20" height="40" rx="2" />

                {/* BAR 2: The Grind (Medium) */}
                <rect x="40" y="35" width="20" height="65" rx="2" />

                {/* BAR 3: The Peak (Tall) */}
                <rect x="70" y="20" width="20" height="80" rx="2" />

                {/* THE BOULDER / THE DOT (Sisyphus) 
            Balanced on the top right edge. 
            Also acts as the 'dot' that completes the abstract 'G' spiral. 
        */}
                <circle cx="80" cy="10" r="10" />

                {/* OPTIONAL: Technical Grid Lines (Low Opacity) for that 'Schematic' look */}
                <path
                    d="M0 95H100 M10 0V100 M40 0V100 M70 0V100"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.2"
                />
            </svg>

            {/* Optional Typography */}
            {withText && (
                <div className="flex flex-col leading-none">
                    <span className="font-mono font-bold text-lg tracking-tighter">GIT_GUD</span>
                    <span className="text-[0.6rem] text-green-500/60 tracking-[0.2em] uppercase">
                        Protocol_v1
                    </span>
                </div>
            )}
        </div>
    );
};

export default GitGudLogo;
