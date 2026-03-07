import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    // Next's build-time typecheck worker is failing with spawn EPERM on this Windows environment.
    // Keep runtime builds unblocked; run `npx tsc --noEmit` separately during development/CI.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
