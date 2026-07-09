import { GitGudLogo } from "gitgud";

export const WithText = () => (
  <div style={{ padding: 12 }}>
    <GitGudLogo className="w-12 h-12" withText />
  </div>
);

export const Sizes = () => (
  <div style={{ display: "flex", alignItems: "flex-end", gap: 24, padding: 12 }}>
    <GitGudLogo className="w-8 h-8" />
    <GitGudLogo className="w-14 h-14" />
    <GitGudLogo className="w-24 h-24" />
  </div>
);
