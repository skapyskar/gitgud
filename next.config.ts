import type { NextConfig } from "next";

// Baseline hardening headers for every response. A strict CSP is intentionally
// omitted: the theme boot script in layout.tsx is inline and Next injects its
// own inline runtime scripts, so a meaningful script-src would need nonces
// wired through the app — revisit if that plumbing is ever added.
const securityHeaders = [
  // Only meaningful over HTTPS (production); harmless in dev.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
